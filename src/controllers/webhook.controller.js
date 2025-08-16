import { env } from '../config/env.js';
import { sendTextMessage, sendTemplate, sendOrderSummary } from '../services/whatsapp.service.js';
import { getMenuText, parseIdsCsvToCounts, mergeCounts, buildItemsFromCart, formatOrderList } from '../services/menu.service.js';
import { getSession, clearSession } from '../state/session.store.js';

const numberListRegex = /^\d+(,\d+)*$/;

export function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token && mode === 'subscribe' && token === env.verifyToken) {
    console.log('✅ Webhook verificado');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
}

export async function handleWebhook(req, res) {
  // Responder inmediato para no exceder 10s
  res.sendStatus(200);

  try {
    const body = req.body;
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!body?.object || !message) return;

    const from = message.from;
    const text = (message.text?.body || '').trim().toLowerCase();
    console.log(`📩 ${from}: ${text}`);

    // Obtén sesión (carrito)
    const session = getSession(from);

    // --- intents ---
    if (text === 'hola') {
      await sendTemplate(from, 'saludo_principal');
      return;
    }

    if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
      return;
    }

    if (text === 'si' || text === 'sí') {
      // Sugerimos que mande números o ver menú
      await sendTextMessage(from, 'Perfecto. Envíame los números separados por coma (ej. 1,2) o escribe "menu" para ver productos.');
      return;
    }

    if (numberListRegex.test(text)) {
      // 1) sumar los nuevos ids al carrito actual
      const newCounts = parseIdsCsvToCounts(text);
      session.cart = mergeCounts(session.cart, newCounts);

      // 2) construir items desde el carrito acumulado
      const { items, total } = await buildItemsFromCart(session.cart);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo o escribe "menu".');
        return;
      }

      const lista = formatOrderList(items);
      const totalFmt = `$${total.toFixed(2)}`;

      // 3) Enviar resumen (plantilla si se puede, o fallback en texto)
      await sendOrderSummary(from, lista, totalFmt);
      return;
    }

    if (text === 'confirmar pedido') {
      // Aquí podrías persistir la orden en BD con session.cart -> (orden/detalle_orden)
      await sendTemplate(from, 'pedido_ya_confirmado').catch(async () => {
        await sendTextMessage(from, '✅ Pedido confirmado. ¡Gracias!');
      });
      clearSession(from);
      return;
    }

    if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado').catch(async () => {
        await sendTextMessage(from, '❌ Pedido cancelado.');
      });
      clearSession(from);
      return;
    }

    if (text === 'ayuda') {
      await sendTemplate(from, 'ayuda').catch(async () => {
        await sendTextMessage(from, 'Comandos: "menu", números (1,2), "confirmar pedido", "cancelar pedido".');
      });
      return;
    }

    // Por defecto
    await sendTextMessage(from, 'No entendí tu mensaje. Escribe "menu" para ver productos o manda los números (ej. 1,2).');
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}
