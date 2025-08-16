// src/controllers/webhook.controller.js
import { env } from '../config/env.js';
import { sendTextMessage, sendTemplate } from '../services/whatsapp.service.js';
import {
  getMenuText,
  getProductsWithQty,
  formatOrderList
} from '../services/menu.service.js';

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

  if (mode && token) {
    if (mode === 'subscribe' && token === env.verifyToken) {
      console.log('✅ Webhook verificado');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
}

/**
 * POST /webhook
 * Recepción de eventos y mensajes entrantes de WhatsApp.
 */
export async function handleWebhook(req, res) {
  try {
    const body = req.body;

    if (!body?.object) {
      // Si no viene de la plataforma esperada, 404 para que no reintente
      return res.sendStatus(404);
    }

    // Puede haber muchos tipos de notificaciones (statuses, etc.)
    // Nos enfocamos en messages[0] si existe
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      // No hay mensaje (p. ej., es un cambio de estado), confirma 200
      return res.sendStatus(200);
    }

    const from = message.from; // número msisdn (ej. 5215551234567)
    const text = (message.text?.body || '').trim().toLowerCase();

    console.log(`📩 Mensaje de ${from}: ${text}`);

    // Flujo básico
    if (text === 'hola') {
      // Debes tener la plantilla aprobada en Meta
      await sendTemplate(from, 'saludo_principal');
    } else if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
    } else if (numberListRegex.test(text)) {
      // Usuario envió lista de IDs (ej. "1,2,1,4")
      const { items, total } = await getProductsWithQty(text);

      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo.');
      } else {
        const lista = formatOrderList(items);
        const totalFmt = `$${total.toFixed(2)}`;

        // Tu plantilla "detalle_producto" debe tener 2 placeholders: {lista} y {total}
        await sendTemplate(from, 'detalle_producto', [lista, totalFmt]);

        // Mensaje de guía (si no lo incluyes dentro de la plantilla)
        await sendTextMessage(from, '¿Añadir más a la orden?');
      }
    } else if (text === 'confirmar pedido') {
      // Plantilla de pedido confirmado (asegúrate de tenerla aprobada)
      await sendTemplate(from, 'pedido_ya_confirmado');
      // Aquí podrías guardar la orden en BD si mantienes un estado previo
    } else if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado');
      // Aquí podrías limpiar el estado de la orden en BD
    } else if (text === 'ayuda') {
      await sendTemplate(from, 'ayuda');
    } else {
      await sendTextMessage(from, 'No entendí tu mensaje. Escribe "menu" para ver productos o "ayuda".');
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Error en webhook:', err);
    return res.sendStatus(500);
  }
}
