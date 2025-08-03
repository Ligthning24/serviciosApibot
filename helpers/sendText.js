// helpers/sendText.js
import axios from 'axios';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

export async function sendText(to, body) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),
    type: 'text',
    text: { body }
  };

  // <-- Aquí pon el log para ver la URL completa
  console.log('> WA_API =', WA_API);
  console.log('> Sending message to:', payload.to);
  console.log('> Payload:', JSON.stringify(payload, null, 2));

  try {
    return await axios.post(WA_API, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    if (err.response) {
      console.error('⛔️ WhatsApp API error:', err.response.status, err.response.data);
    } else {
      console.error('⛔️ Unknown error:', err.message);
    }
    throw err;
  }
}
