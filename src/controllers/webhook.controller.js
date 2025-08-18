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

    // ... arriba ya dejas tal cual

    // 3) El usuario envía números (agregar al carrito)
    if (numberListRegex.test(text)) {
      const newCounts = parseIdsCsvToCounts(text);
      session.cart = mergeCounts(session.cart, newCounts); // <- retorna Map

      const { items, total } = await buildItemsFromCart(session.cart);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo o escribe "menu".');
        return;
      }

      const lista1line = formatOrderListSingleLine(items);
      const totalFmt = `$${total.toFixed(2)}`;
      await sendTemplate(from, 'detalle_producto', [lista1line, totalFmt]);
      return;
    }

    // ✅ CONFIRMAR PEDIDO (texto ya está en minúsculas)
    console.log('Texto normalizado:', JSON.stringify(text));
    if (text === 'confirmar pedido') {
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

      // Limpia correctamente (como es Map)
      clearSession(from);           // <-- opción A: borra toda la sesión
      // sess.cart = new Map();     // <-- opción B: solo vacía el carrito
      return;
    }

    // 5) Cancelar pedido
    if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado').catch(async () => {
        await sendTextMessage(from, '❌ Pedido cancelado.');
      });
      clearSession(from); // importante limpiar el Map
      return;
    }


      // Construir items y total
      const { items, total } = await buildItemsFromCart(session.cart);
      const lista = formatOrderList(items);

      const resumen =
        `✅ Tu pedido ha sido registrado.

Detalle del pedido:
${lista}

Total: $${total.toFixed(2)}

Gracias por tu compra 🎉`;

      // Enviar mensaje de texto normal (no plantilla)
      await sendTextMessage(from, resumen);
      // Limpiar carrito después de confirmar
      session.cart = {};
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
    await sendTextMessage(from, 'No entendí tu mensaje. Escribe "menu" para ver productos, o "confirmar pedido" para proceder con la compra, o "cancelar pedido" para cancelar.');
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}
