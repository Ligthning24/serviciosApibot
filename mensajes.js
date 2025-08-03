// mensajes.js
import 'dotenv/config';
import { sendText } from './helpers/sendText.js';

export default async function handleMessages(req, res) {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (msg?.text?.body) {
    console.log('▶️ Incoming:', msg.text.body, 'from:', msg.from);
    await sendText(msg.from, `Echo: ${msg.text.body}`);
  }
  return res.sendStatus(200);
}
