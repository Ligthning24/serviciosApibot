import { env } from '../config/env.js';
import { sendTextMessage, sendTemplate } from '../services/whatsapp.service.js';
import { getMenuText, getProductsByIds } from '../services/menu.service.js';

const numberListRegex = /^\d+(,\d+)*$/;

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

export async function handleWebhook(req, res) {
  try {
    const body = req.body;

    if (!body.object) {
      return res.sendStatus(404);
    }

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      // Puede ser status u otro evento, responde 200 para que Meta no reintente
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = (message.text?.body || '').trim().toLowerCase();

    console.log(`📩 Mensaje de ${from}: ${text}`);

    if (text === 'hola') {
      // Envía un template de saludo (debes tenerlo aprobado)
      await sendTemplate(from, 'saludo_principal');
    } else if (text === 'menu' || text === 'ver productos') {
      const menuText = await getMenuText();
      await sendTextMessage(from, menuText);
    } else if (numberListRegex.test(text)) {
      // Usuario envió lista de IDs
      const products = await getProductsByIds(text);
      if (!products.length) {
        await sendTextMessage(from, 'No encontré productos con esos IDs. Inténtalo de nuevo.');
      } else {
        let total = 0;
        const lista = products
          .map(p => {
            total += Number(p.precio);
            return `${p.nombre} $${p.precio}`;
          })
          .join(', ');

        const totalFmt = `$${(Math.round(total * 100) / 100).toFixed(2)}`;

        // Template de detalle_producto con 2 variables: lista y total
        // Asegúrate que tu plantilla tenga 2 placeholders en el cuerpo
        await sendTemplate(from, 'detalle_producto', [lista, totalFmt]);

        // (Opcional) Indicar cómo confirmar o cancelar
        await sendTextMessage(from, 'Responde "confirmar pedido" para confirmar o "cancelar pedido" para cancelar.');
      }
    } else if (text === 'confirmar pedido') {
      await sendTemplate(from, 'pedido_ya_confirmado');
    } else if (text === 'cancelar pedido') {
      await sendTemplate(from, 'pedido_cancelado');
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
