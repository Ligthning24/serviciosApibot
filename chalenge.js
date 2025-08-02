// chalenge.js
import fs from 'fs';
import { config } from 'dotenv';

config();
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

export default function verifyWebhook(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  fs.appendFileSync(
    'debug_get_log.txt',
    `${new Date().toISOString()} GET /webhook: ${JSON.stringify(req.query)}\n`
  );

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  fs.appendFileSync(
    'debug_token_log.txt',
    `${new Date().toISOString()} - Invalid verify token\n`
  );
  return res.sendStatus(403);
}