// templates_bienvenida.js
import axios from 'axios';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

export async function plantilla_bienvenida(to) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'template',
    template: {
      name: 'bienvenida',       // tu nombre de plantilla aprobado
      language: { code: 'es_MX' }
      // no necesitas componentes si tu plantilla no los usa
    }
  };
  return axios.post(WA_API, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}
