// src/controllers/webhook.controller.js
import { env } from '../config/env.js';
import { sendTextMessage, sendTemplate } from '../services/whatsapp.service.js';
import { getMenuText, getProductsWithQty, formatOrderList } from '../services/menu.service.js';

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
  // 1) Responder de inmediato para no rebasar 10s
  res.sendStatus(200);

  try {
    const body = req.body;
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!body?.object || !message) return;

    const from = message.from;
    const text = (message.text?.body || '').trim().toLowerCase();
    console.log(`📩 Mensaje de ${from}: ${text}`);

    // 2) Procesar ya sin bloquear la respuesta
    if (text === 'hola') {
      await sendTemplate(from, 'saludo_principal');
      return;
    }

    if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
      return;
    }

    if (numberListRegex.test(text)) {
      const { items, total } = await getProductsWithQty(text);
      if (!items.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo.');
        return;
      }

      const lista = formatOrderList(items);
      const totalFmt = `$${total.toFixed(2)}`;

      // 3) Enviar en paralelo (plantilla + mensaje guía), más rápido que en serie
      await Promise.allSettled([
        sendTemplate(from, 'detalle_producto', [lista, totalFmt]),
        sendTextMessage(from, '¿Añadir más a la orden?')
      ]);
      return;
    }

    if (text === 'confirmar pedido') {
      await sendTemplate(from, 'pedido_ya_confirmado');
      return;
    }

    if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado');
      return;
    }

    if (text === 'ayuda') {
      await sendTemplate(from, 'ayuda');
      return;
    }

    await sendTextMessage(from, 'No entendí tu mensaje. Escribe "menu" para ver productos o "ayuda".');
  } catch (err) {
    console.error('Error en webhook (async):', err);
  }
}
