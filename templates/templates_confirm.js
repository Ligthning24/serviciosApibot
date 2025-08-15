// templates_confirm.js
import axios from 'axios';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

/**
 * Elimina saltos de línea, tabs y colapsa más de 4 espacios
 */
function cleanText(str) {
  return str
    .replace(/[\r\n\t]+/g, ' ')     // quita \r, \n y \t
    .replace(/ {5,}/g, '    ')      // colapsa >4 espacios en 4 espacios
    .trim();
}

/**
 * Envía la plantilla de confirmación de orden.
 * @param {string|number} to        — número destino
 * @param {string[]}      items     — array de strings tipo "2 x Producto A"
 * @param {number}        total     — total del pedido
 */
export async function plantilla_confirmarOrden(to, items, total) {
  // 1. Une los ítems con coma y espacio
  const listaRaw = items.join(', ');
  // 2. Sanitiza el texto resultante
  const listaClean = cleanText(listaRaw);
  const totalClean = cleanText(total.toString());

  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'template',
    template: {
      name: 'confirmar_orden',
      language: { code: 'es_MX' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: listaClean },
            { type: 'text', text: totalClean }
          ]
        }
      ]
    }
  };

  return axios.post(WA_API, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}
