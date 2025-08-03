// mensajes.js
import 'dotenv/config';
import { plantilla_bienvenida }   from './templates_bienvenida.js';
import { parseSeleccion }          from './utils/parseSeleccion.js';
import { plantilla_confirmarOrden } from './templates_confirm.js';
import { sendText }                from './helpers/sendText.js';

export default async function handleMessages(req, res) {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from     = msg.from;
  const text     = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;

  // 1) Inicio: siempre disparas tu plantilla 'bienvenida'
  //    (o al recibir un “hi”/“hola” si lo prefieres)
  if (!buttonId && !text) {
    await plantilla_bienvenida(from);
    return res.sendStatus(200);
  }

  // 2) Si viene del botón Menu de 'bienvenida'
  if (buttonId === 'btn_menu') {
    // Aquí mandamos un texto con el menú:
    const menuTexto =
      'Nuestros productos:\n' +
      '1) Refresco – $25\n' +
      '2) Coctel grande – $130\n' +
      '3) Coctel chico – $90\n' +
      '4) Tostada – $60\n\n' +
      'Envía los números separados por comas. Ej: 1,3,4';
    await sendText(from, menuTexto);
    return res.sendStatus(200);
  }

  // 3) Selección múltiple (usuario responde “1,2,2,3,1”)
  if (text && /^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    const seleccion  = parseSeleccion(text);
    const listaLines = seleccion
      .map(i => `- ${i.producto} x${i.cantidad}`)
      .join('\n');
    const total = seleccion
      .reduce((sum, i) => sum + i.precio * i.cantidad, 0);
    await plantilla_confirmarOrden(from, listaLines, total.toString());
    return res.sendStatus(200);
  }

  // 4) Confirmar/Cancelar botones (igual que antes)…
  //    buttonId 'btn_confirmar' y 'btn_cancelar'
  //    => sendText(...)
  // …

  // 5) Fallback
  await sendText(from, 'Escribe “menu” para iniciar.');
  res.sendStatus(200);
}
