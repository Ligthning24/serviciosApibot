// templates.js
import axios from 'axios';

const TOKEN = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

async function sendTemplate(payload) {
  return axios.post(WA_API, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}

export async function plantilla_bienvenida(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'template',
    template: {
      name: 'bienvenida',
      language: { code: 'es_MX' }
    }
  };
  return sendTemplate(payload);
}

// ... aquí otras plantillas como seleccion_menu, confirmar_orden, etc.