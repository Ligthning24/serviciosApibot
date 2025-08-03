// mensajes.js
import 'dotenv/config';
import { plantilla_seleccionMenu }   from './templates_menu.js';
import { parseSeleccion }            from './utils/parseSeleccion.js';
import { plantilla_confirmarOrden }  from './templates_confirm.js';
import { sendText }                  from './helpers/sendText.js';

export default async function handleMessages(req, res) {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) {
    return res.sendStatus(200);
  }

  const from     = msg.from;
  const text     = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;

  // 1) Selección múltiple (texto "1,2,2,3,1", etc.)
  if (text && /^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    const seleccion  = parseSeleccion(text);
    const listaLines = seleccion
      .map(i => `- ${i.producto} x${i.cantidad}`)
      .join('\n');
    const total = seleccion
      .reduce((sum, i) => sum + i.precio * i.cantidad, 0);

    // Envía plantilla de confirmación con {{1}} = listaLines, {{2}} = total
    await plantilla_confirmarOrden(from, listaLines, total.toString());
    return res.sendStatus(200);
  }

  // 2) Botones de confirmación/cancelación
  if (buttonId) {
    if (buttonId === 'btn_confirmar') {
      // Aquí procesas el pedido en BD, pagarlo, etc.
      await sendText(from, '✅ Tu pedido ha sido confirmado. ¡Muchas gracias!');
    } else if (buttonId === 'btn_cancelar') {
      await sendText(from, '❌ Pedido cancelado. Si quieres, escribe “menu” para empezar de nuevo.');
    } else {
      await sendText(from, 'No entendí tu opción. Escribe “menu” para ver el menú.');
    }
    return res.sendStatus(200);
  }

  // 3) Comando “menu”: envío de plantilla de selección múltiple
  if (text?.toLowerCase() === 'menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }

  // 4) Fallback genérico
  await sendText(from, 'Escribe “menu” para ver nuestros productos.');
  return res.sendStatus(200);
}
