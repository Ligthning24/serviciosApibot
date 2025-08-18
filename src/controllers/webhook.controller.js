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

// Lista de enteros separados por coma, p.ej. "1,2,1,4"
const numberListRegex = /^\d+(,\d+)*$/;

/** GET /webhook — verificación de Meta */
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

/** POST /webhook — recepción de eventos WhatsApp */
export async function handleWebhook(req, res) {
  // Responder de inmediato (Meta exige <10s)
  res.sendStatus(200);

  try {
    const body = req.body;
    const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!body?.object || !msg) return; // puede ser status

    const from = msg.from; // msisdn (ej. 521...)
    const text = (msg.text?.body || '').trim().toLowerCase();
    console.log(`📩 ${from}: ${text}`);

    // Sesión por usuario (carrito = Map)
    const session = getSession(from);

    // Saludo
    if (text === 'hola') {
      await sendTemplate(from, 'saludo_principal').catch(async () => {
        await sendTextMessage(from, '¡Hola! Escribe "menu" para ver productos.');
      });
      return;
    }

    // Menú
    if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
      return;
    }

    //Agregar productos por IDs
    if (numberListRegex.test(text)) {
      // Sumar nuevos IDs al carrito acumulado (Map)
      const newCounts = parseIdsCsvToCounts(text);
      session.cart = mergeCounts(session.cart, newCounts);

      // Construir items + total desde carrito
      const { items, total } = await buildItemsFromCart(session.cart);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo o escribe "menu".');
        return;
      }

      // Variables para plantilla (sin saltos en {{1}})
      const lista1line = formatOrderListSingleLine(items);
      const totalFmt = `$${total.toFixed(2)}`;

      // Envia la plantilla detalle_producto
      // Debe tener 2 variables en el cuerpo: {{1}} = lista, {{2}} = total
      await sendTemplate(from, 'detalle_producto', [lista1line, totalFmt]);
      return;
    }

    //Confirmar pedido (texto ya está en minúsculas)
    if (text === 'Confirmar pedido') {
      const sess = getSession(from); // { cart: Map() }
      if (!sess || !sess.cart || sess.cart.size === 0) {
        await sendTextMessage(from, 'No tienes productos en tu carrito. Escribe "menu" para empezar.');
        return;
      }

      const { items, total } = await buildItemsFromCart(sess.cart);
      const lista = formatOrderList(items); // multilínea con viñetas

      const resumen = `✅ Tu pedido ha sido registrado.

Detalle del pedido:
${lista}

Total: $${total.toFixed(2)}

Gracias por tu compra 🎉`;

      await sendTextMessage(from, resumen);

      // Limpieza correcta (Map)
      clearSession(from);// borra toda la sesión del usuario
      return;
    }

    // Cancelar pedido
    if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado').catch(async () => {
        await sendTextMessage(from, '❌ Pedido cancelado.');
      });
      clearSession(from);
      return;
    }

    // Ayuda
    if (text === 'ayuda') {
      await sendTemplate(from, 'ayuda').catch(async () => {
        await sendTemplate(from, 'ayuda' );
      });
      return;
    }

  
    // Por defecto
    await sendTextMessage(
      from,
      'No entendí tu mensaje. Por favor escribe "menu" para ver y elegir de nuevo los productos, o "confirmar pedido"/"cancelar pedido". Si necesitas ayuda escribe "Ayuda".'
    );
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}