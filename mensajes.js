// mensajes.js
import { plantilla_bienvenida }    from './templates_bienvenida.js';
import { plantilla_seleccionMenu }  from './templates_menu.js';  // 👈 importa aquí
import { parseSeleccion }           from './utils/parseSeleccion.js';
import { plantilla_confirmarOrden } from './templates_confirm.js';
import { sendText }                 from './helpers/sendText.js';
import { getAvailableProducts } from './products.js';
import { plantilla_solicitarInstrucciones } from './templates_instruccion.js';


const carts = new Map();

export default async function handleMessages(req, res) {
  const msg      = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return res.sendStatus(200);

  
  const from     = msg.from;
  const text     = msg.text?.body?.trim();
  const buttonId = msg.interactive?.button_reply?.id;
  const listReply = msg.interactive?.list_reply;

   // Si escribe uno de estos enviamos la bienvenida
  if (text && /^(hola|hi|hello)$/i.test(text)) {
    await plantilla_bienvenida(from);
    return res.sendStatus(200);
  }

  // Si pulsa el botón “Menu” de la plantilla bienvenida
  if (buttonId === 'Menu' || buttonId === 'btn_menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }
  //tambirn si escribe menu por texto se reenviar la plantilla del menu
  if (text?.toLowerCase() === 'menu' || text?.toLowerCase() === 'Menu') {
    await plantilla_seleccionMenu(from);
    return res.sendStatus(200);
  }

  if (listReply) {
    const prodId = parseInt(listReply, 10);
    const productos = await getAvailableProducts();
    const prod = productos.find(p => p.id === prodId);
    if (!prod) {
      await sendText(from, 'Lo siento, no encontré ese producto. Intenta de nuevo.');
      return res.sendStatus(200);
    }

    // 2.a) Agrega al carrito
    const cart = carts.get(from) || { items: [], total: 0 };
    cart.items.push({ producto: prod.nombre, precio: prod.precio, cantidad: 1 });
    cart.total += prod.precio;
    carts.set(from, cart);

    await sendText(from, `✅ Agregaste 1 x ${prod.nombre} ($${prod.precio}).\nEscribe "menu" para añadir más o "confirmar" para terminar.`);
    return res.sendStatus(200);
  }
  // Selección numérica: ya no construimos texto con '\n'
  if (text && /^[1-4](?:\s*,\s*[1-4])*$/g.test(text)) {
    const seleccion = parseSeleccion(text);

    // 1) Creamos array de strings "2 x Producto A"
    const items = seleccion.map(i => `${i.cantidad} x ${i.producto}`);

    // 2) Calculamos total como número
    const total = seleccion.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

    // 3) Llamamos a la plantilla con items[] y total
    try {
      await plantilla_confirmarOrden(from, items, total);
    } catch (err) {
      console.error('Error enviando confirmarOrden:', err);
      await sendText(from, 'Sataa andagii .');
    }
    return res.sendStatus(200);
  }
 // 5) Botones de confirmación/cancelación
  if (buttonId) {
    if (buttonId === 'btn_confirmar') {
      await sendText(from, '✅ Tu pedido ha sido confirmado. ¡Gracias por ordenar con nosotros!');
    } else if (buttonId === 'btn_cancelar') {
      await sendText(from, '❌ Pedido cancelado. Escríbenos “menu” si quieres volver a intentarlo.');
    } else {
      await sendText(from, 'No entendí esa opción. Escríbenos “menu” para ver el menú.');
    }
    return res.sendStatus(200);
  }

  await sendText(from, 'Escribe “menu” para ver nuestros productos.');
  return res.sendStatus(200);
}
