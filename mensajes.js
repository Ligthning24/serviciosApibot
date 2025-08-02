// mensajes.js
import fs from 'fs';
import { plantilla_bienvenida } from './templates.js';
import { plantilla_seleccionMenu } from './templates_menu.js';
import { sendTemplate_confirmarOrden } from './templates_confirm.js';
import { parseSeleccion } from './utils/parseSeleccion.js';
import { sendText } from './helpers/sendText.js';

export default async function handleMessages(req, res) {
  const entry = req.body.entry?.[0]?.changes?.[0]?.value;
  fs.appendFileSync('debug_post_log.txt', `${new Date().toISOString()} POST: ${JSON.stringify(req.body)}\n`);
  const msg = entry?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;

  // 1) Selección múltiple (texto "1,2,2,3,1")
  if (text && /^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    const seleccion = parseSeleccion(text);
    const listaLines = seleccion.map(i => `- ${i.producto} x${i.cantidad}`).join('\n');
    const total = seleccion.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    // Enviar confirmación (ej. plantilla_confirmarOrden)
    await sendTemplate_confirmarOrden(from, listaLines, total);
    return res.sendStatus(200);
  }

  // 2) Botones interactivos
  if (buttonId) {
    switch (buttonId) {
      case 'btn_bienvenida':
        await plantilla_bienvenida(from);
        break;
      case 'btn_confirmar':
        await sendText(from, '✅ Tu pedido ha sido confirmado!');
        break;
      case 'btn_cancelar':
        await sendText(from, '❌ Pedido cancelado.');
        break;
      default:
        await sendText(from, 'No entendí la opción.');
    }
    return res.sendStatus(200);
  }

  // 3) Comando "menu"
  if (text?.toLowerCase() === 'menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }

  // 4) Fallback
  await sendText(from, 'Escribe "menu" para comenzar.');
  return res.sendStatus(200);
}