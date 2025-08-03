// helpers/sendText.js
import axios from 'axios';

const TOKEN           = process.env.ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const WA_API          = `https://graph.facebook.com/v23.0/${PHONE_NUMBER_ID}/messages`;

export async function sendText(to, body) {
  const payload = {
    messaging_product: 'whatsapp',
    to: to.toString(),      // asegúrate de que sea sólo dígitos
    type: 'text',
    text: { body }
  };

  console.log('📤 Sending message:');
  console.log('   to:', JSON.stringify(payload.to));
  console.log('   payload:', JSON.stringify(payload, null, 2));
  console.log('> WA_API =', WA_API);

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
