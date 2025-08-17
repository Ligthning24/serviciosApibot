import axios from 'axios';
import http from 'http';
import https from 'https';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30_000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50, keepAliveMsecs: 30_000 });

const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.graphApiVersion}/${env.phoneNumberId}`,
  timeout: 6000,
  httpAgent,
  httpsAgent,
  headers: {
    Authorization: `Bearer ${env.accessToken}`,
    'Content-Type': 'application/json'
  }
});

async function postWithRetry(path, payload, retries = 1) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await client.post(path, payload);
    } catch (err) {
      const data = err.response?.data;
      console.error('WhatsApp API error:', JSON.stringify(data || err.message));
      const status = err.response?.status;
      const retriable = status >= 500 || status === 429 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';
      if (i < retries && retriable) {
        await new Promise(r => setTimeout(r, 250 * (i + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function sendTextMessage(to, message) {
  const normalizedTo = normalizePhone(to);
  const { data } = await postWithRetry('/messages', {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    text: { body: message }
  });
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
  return data;
}

function sanitizeTemplateParam(value) {
  if (value == null) return '';
  return String(value)
    .replace(/[\r\n\t]+/g, ' ')   // quita saltos y tabs
    .replace(/\s{2,}/g, ' ')      // colapsa espacios consecutivos
    .trim();
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
      {
        type: 'body',
        parameters: variables.map(v => ({ type: 'text', text: sanitizeTemplateParam(v) }))
      }
    ];
  }

  const { data } = await postWithRetry('/messages', body);
  return data;
}


/**
 * Envía el resumen usando PLANTILLA; si falla, manda TEXTO con el mismo contenido.
 */
export async function sendOrderSummary(to, lista, totalFmt) {
  try {
    await sendTemplate(to, 'detalle_producto', [lista, totalFmt]); // asegúrate: 2 variables en el body de la plantilla
  } catch (e) {
    // Fallback en texto para que el usuario SIEMPRE vea su pedido
    const fallback =
      `Has seleccionado:\n${lista}\n\nTotal: ${totalFmt}\n\n` +
      `Responde:\n• Números adicionales (ej. 2,3)\n• "confirmar pedido"\n• "cancelar pedido"\n• "menu" para ver productos`;
    await sendTextMessage(to, fallback);
  }
}
