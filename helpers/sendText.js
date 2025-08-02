// helpers/sendText.js
import axios from 'axios';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

export async function sendText(to, body) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'text',
    text: { body }
  };

  return axios.post(WA_API, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
}
