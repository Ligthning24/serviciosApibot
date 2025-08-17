// src/controllers/webhook.controller.js
import { env } from '../config/env.js';
import { sendTextMessage, sendTemplate } from '../services/whatsapp.service.js';
import {
  getMenuText,
  parseIdsCsvToCounts,
  mergeCounts,
  buildItemsFromCart,
  formatOrderList,
  formatOrderListSingleLine
} from '../services/menu.service.js';
import { getSession, clearSession } from '../state/session.store.js';

// Coincide con "1,2,1,4" (lista de enteros separados por coma)
const numberListRegex = /^\d+(,\d+)*$/;

/**
 * GET /webhook
 * Verificación del webhook de Meta (suscripción).
 */
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

/**
 * POST /webhook
 * Recepción de eventos y mensajes entrantes de WhatsApp.
 * Responde 200 inmediatamente para no exceder los 10s que exige Meta.
 */
export async function handleWebhook(req, res) {
  // Responder de inmediato
  res.sendStatus(200);

  try {
    const body = req.body;
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!body?.object || !msg) return; // puede ser status u otro evento

    const from = msg.from; // msisdn (ej. 52155...)
    const text = (msg.text?.body || '').trim().toLowerCase();
    console.log(`📩 ${from}: ${text}`);

    // Sesión/carro por usuario
    const session = getSession(from);

    // -------- Intents principales --------

    // 1) Saludo
    if (text === 'hola') {
      await sendTemplate(from, 'saludo_principal').catch(async () => {
        await sendTextMessage(from, '¡Hola! Escribe "menu" para ver productos.');
      });
      return;
    }

    // 2) Mostrar menú
    if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
      return;
    }

    // 3) El usuario envía números (agregar al carrito)
    if (numberListRegex.test(text)) {
      // a) Sumar nuevos IDs al carrito acumulado
      const newCounts = parseIdsCsvToCounts(text);
      session.cart = mergeCounts(session.cart, newCounts);

      // b) Construir items y total desde carrito
      const { items, total } = await buildItemsFromCart(session.cart);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo o escribe "menu".');
        return;
      }
      // variable 1 en UNA línea (sin saltos)
      const lista1line = formatOrderListSingleLine(items);
      const totalFmt = `$${total.toFixed(2)}`;

      // d) Enviar SÓLO la plantilla (ya contiene los botones)
      // Asegúrate que "detalle_producto" tenga EXACTAMENTE 2 variables de cuerpo: {{1}} lista, {{2}} total
      await sendTemplate(from, 'detalle_producto', [lista1line, totalFmt]);
      return;
    }

    // 4) Confirmación del pedido (botón/quick reply)
    if (text === 'confirmar pedido') {
      // Aquí puedes persistir la orden en BD usando session.cart si quieres
      await sendTemplate(from, 'pedido_ya_confirmado').catch(async () => {
        await sendTextMessage(from, '✅ Pedido confirmado. ¡Gracias!');
      });
      clearSession(from);
      return;
    }

    // 5) Cancelar pedido (botón/quick reply)
    if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado').catch(async () => {
        await sendTextMessage(from, '❌ Pedido cancelado.');
      });
      clearSession(from);
      return;
    }

    // 6) Ayuda
    if (text === 'ayuda') {
      await sendTemplate(from, 'ayuda').catch(async () => {
        await sendTextMessage(from, 'Comandos: "menu", números (1,2), "confirmar pedido", "cancelar pedido".');
      });
      return;
    }

    // 7) Mensaje por defecto
    await sendTextMessage(from, 'No entendí tu mensaje. Escribe "menu" para ver productos o manda los números (ej. 1,2).');
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}
