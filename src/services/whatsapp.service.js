// src/services/whatsapp.service.js
import axios from 'axios';
import http from 'http';
import https from 'https';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30_000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30_000 });

const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.graphApiVersion}/${env.phoneNumberId}`,
  timeout: 6000, // 6s
  httpAgent,
  httpsAgent,
  headers: {
    Authorization: `Bearer ${env.accessToken}`,
    'Content-Type': 'application/json'
  }
});

async function postWithRetry(path, payload, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.post(path, payload);
    } catch (err) {
      const status = err.response?.status;
      const retriable = status >= 500 || status === 429 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
      if (i < retries && retriable) {
        const backoff = 250 * Math.pow(2, i); // 250ms, 500ms…
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      throw err;
    }
  }
}

export async function sendTextMessage(to, message) {
  const normalizedTo = normalizePhone(to);
  const body = { messaging_product: 'whatsapp', to: normalizedTo, text: { body: message } };
  const { data } = await postWithRetry('/messages', body);
  console.log(`✅ Texto enviado a ${normalizedTo}`, data?.messages?.[0]?.id || '');
  return data;
}

export async function sendTemplate(to, templateName, variables = []) {
  const normalizedTo = normalizePhone(to);
  const body = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: { name: templateName, language: { code: 'es_MX' } }
  };
  if (variables.length) {
    body.template.components = [
      { type: 'body', parameters: variables.map(v => ({ type: 'text', text: String(v) })) }
    ];
  }
  const { data } = await postWithRetry('/messages', body);
  console.log(`✅ Template "${templateName}" enviado a ${normalizedTo}`, data?.messages?.[0]?.id || '');
  return data;
}
