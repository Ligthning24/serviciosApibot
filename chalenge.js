// chalenge.js
import 'dotenv/config';

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export default function verifyWebhook(req, res) {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('🚀 WEBHOOK VERIFIED with challenge:', challenge);
    return res.status(200).send(challenge);
  }

  console.warn('❌ WEBHOOK verification failed:', req.query);
  return res.sendStatus(403);
}
