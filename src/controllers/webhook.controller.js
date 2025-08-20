// src/controllers/webhook.controller.js
import { env } from '../config/env.js';
import { 
  sendTextMessage, 
  sendTemplate, 
  sendInteractiveButtons 
} from '../services/whatsapp.service.js';
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
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    if (!body?.object || !value) return;

    // Distinguimos entre mensajes y estatus
    if (!value.messages) {
      console.log("📊 Status recibido:", JSON.stringify(value.statuses, null, 2));
      return;
    }

    const msg = value.messages[0];
    const from = msg.from; // msisdn (ej. 521...)
    let text = (msg.text?.body || '').trim().toLowerCase();

    // Detectar si es respuesta de botón interactivo
    if (msg.type === "interactive" && msg.interactive?.type === "button_reply") {
      const buttonId = msg.interactive.button_reply.id;
      const buttonTitle = msg.interactive.button_reply.title;
      console.log(` Botón presionado: ${buttonId} (${buttonTitle})`);

      text = buttonId.toLowerCase(); // normalizamos
    }

    console.log(`📩 ${from}: ${text}`);

    // Sesión por usuario (carrito = Map)
    const session = getSession(from);

    // Saludo inicial
    if (text === 'hola') {
      await sendInteractiveButtons(from,
        '¡Hola y bienvenido!\nBienvenido(a) a nuestro servicio de pedidos.\n\nSelecciona una opción:',
        [
          { id: "ver productos", title: "Ver productos" },
          { id: "ayuda", title: "Ayuda" }
        ]
      );
      return;
    }

    // Menú
    if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
      return;
    }

    // Agregar productos por IDs
    if (numberListRegex.test(text)) {
      const newCounts = parseIdsCsvToCounts(text);

      // IDs válidos del menú (ajusta según tus productos)
      const validIds = [1, 2, 3, 4, 5, 6];
      const invalidIds = [...newCounts.keys()].filter(id => !validIds.includes(id));

      if (invalidIds.length > 0) {
        await sendTextMessage(
          from,
          `⚠️ Los siguientes productos no existen: ${invalidIds.join(", ")}. Selecciona solo los que aparecen en el menú.`
        );
        return;
      }

      // Sumar al carrito existente
      session.cart = mergeCounts(session.cart, newCounts);

      const { items, total } = await buildItemsFromCart(session.cart);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos válidos. Inténtalo de nuevo o escribe "menu".');
        return;
      }

      const lista1line = formatOrderListSingleLine(items);
      const totalFmt = `$${total.toFixed(2)}`;

      // Enviar botones dinámicos en lugar de plantilla
      await sendInteractiveButtons(from,
        `Has seleccionado los siguientes productos:\n${lista1line}\n\nTotal: ${totalFmt}\n\n¿Qué deseas hacer?`,
        [
          { id: "confirmar pedido", title: "Confirmar pedido" },
          { id: "ver productos", title: "Ver productos" },
          { id: "cancelar pedido", title: "Cancelar pedido" }
        ]
      );
      return;
    }

    // Confirmar pedido
    if (text === 'confirmar pedido') {
      const sess = getSession(from);
      if (!sess || !sess.cart || sess.cart.size === 0) {
        await sendTextMessage(from, 'No tienes productos en tu carrito. Escribe "menu" para empezar.');
        return;
      }

      const { items, total } = await buildItemsFromCart(sess.cart);
      const lista = formatOrderList(items);

      const resumen = `✅ Tu pedido ha sido registrado.\n\nDetalle del pedido:\n${lista}\n\nTotal: $${total.toFixed(2)}\n\nGracias por tu compra 🎉`;

      await sendTextMessage(from, resumen);

      clearSession(from);
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
        await sendTextMessage(from, 'Aquí tienes la ayuda disponible.');
      });
      return;
    }

    // Por defecto
    await sendTextMessage(
      from,
      'No entendí tu mensaje. Escribe "menu" para ver los productos, "confirmar pedido" o "cancelar pedido". Si necesitas ayuda escribe "Ayuda".'
    );
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}
