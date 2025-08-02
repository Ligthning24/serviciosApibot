// mensajes.js
const fs = require('fs');
const { plantilla_seleccionMenu } = require('./templates_menu');
const { parseSeleccion } = require('./utils/parseSeleccion');
const { plantilla_confirmarOrden } = require('./templates_confirm');
const { sendText } = require('./helpers/sendText');

module.exports = async function handleMessages(req, res) {
  fs.appendFileSync('debug_post_log.txt',
    `${new Date().toISOString()} POST: ${JSON.stringify(req.body)}\n`);

  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;

  // 1) Selección múltiple
  if (text && /^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    const seleccion = parseSeleccion(text);
    const listaLines = seleccion
      .map(i => `- ${i.producto} x${i.cantidad}`)
      .join('\n');
    const total = seleccion
      .reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    await plantilla_confirmarOrden(from, listaLines, total);
    return res.sendStatus(200);
  }

  // 2) Botones de confirmación/cancelación
  if (buttonId) {
    if (buttonId === 'btn_confirmar') {
      await sendText(from, '✅ Tu pedido ha sido confirmado!');
    } else if (buttonId === 'btn_cancelar') {
      await sendText(from, '❌ Pedido cancelado.');
    } else {
      await sendText(from, 'No entendí la opción.');
    }
    return res.sendStatus(200);
  }

  // 3) Comando "menu"
  if (text && text.toLowerCase() === 'menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }

  // 4) Fallback
  await sendText(from, 'Escribe "menu" para comenzar.');
  return res.sendStatus(200);
};
