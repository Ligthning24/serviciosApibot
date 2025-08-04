// mensajes.js
import { plantilla_bienvenida }    from './templates_bienvenida.js';
import { plantilla_seleccionMenu }  from './templates_menu.js';  // 👈 importa aquí
import { parseSeleccion }           from './utils/parseSeleccion.js';
import { plantilla_confirmarOrden } from './templates_confirm.js';
import { sendText }                 from './helpers/sendText.js';


export default async function handleMessages(req, res) {
  const msg      = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  const from     = msg.from;
  const text     = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;

   // Si escribe “hola” enviamos bienvenida
  if (text && /^(hola|hi|hello)$/i.test(text)) {
    await plantilla_bienvenida(from);
    return res.sendStatus(200);
  }

  // Si pulsa el botón “Menu” de la plantilla bienvenida  
  // (asegúrate de que el id coincide con el que configuraste en Meta)
  if (buttonId === 'Menu' || buttonId === 'btn_menu') {
    // 👉 Aquí lanzas directamente tu plantilla de selección múltiple
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }

  //  - Si escribe “menu” por texto, también puedes reenviar la plantilla:
  if (text?.toLowerCase() === 'menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }
  
  // 4. Selección múltiple (patrón “1,2,2,3,1”)
  if (/^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    // parseas y envías confirmación…
    const seleccion  = parseSeleccion(text);
    const listaLines = seleccion.map(i=>`- ${i.producto} x${i.cantidad}`).join('\n');
    const total      = seleccion.reduce((s,i)=>s + i.precio*i.cantidad, 0);
    await plantilla_confirmarOrden(from, listaLines, total.toString());
    return res.sendStatus(200);
  }

  // 5. Botones Confirmar/Cancelar
  if (buttonId) {
    if (buttonId === 'btn_confirmar') {
      await sendText(from, '✅ Tu pedido ha sido confirmado.');
    } else if (buttonId === 'btn_cancelar') {
      await sendText(from, '❌ Pedido cancelado.');
    } else {
      await sendText(from, 'No entendí esa opción.');
    }
    return res.sendStatus(200);
  }

  // 6. Fallback final
  await sendText(from, 'Escribe “menu” para ver nuestros productos.');
  return res.sendStatus(200);
}
