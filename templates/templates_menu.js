// templates_menu.js
import axios from 'axios';
import { getAvailableProducts } from './models/products.js';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

export async function plantilla_seleccionMenu(to) {
  const productos = await getAvailableProducts();

  // Construye las filas para el mensaje interactivo
  const rows = productos.map(p => ({
    id: String(p.id),                // lo recibiremos luego con list_reply.id
    title: p.nombre,
    description: `$${p.precio}`
  }));

  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: 'Menú de productos' },
      body: { text: 'Selecciona uno para agregar al pedido' },
      footer: { text: ' 🔢 Pulsa “Volver al menú” para ver más' },
      action: {
        button: 'Ver productos',
        sections: [
          { title: 'Disponibles', rows }
        ]
      }
    }
  };

  return axios.post(WA_API, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}
