// src/services/whatsapp.service.js
import axios from 'axios';
import http from 'http';
import https from 'https';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

// Agents con keep-alive para reusar conexiones
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30_000
});
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30_000
});

// Cliente axios configurado a la API de WhatsApp
export const client = axios.create({
  baseURL: `https://graph.facebook.com/${env.graphApiVersion}/${env.phoneNumberId}`,
  timeout: 6000, // 6s
  httpAgent,
  httpsAgent,
  headers: {
    Authorization: `Bearer ${env.accessToken}`,
    'Content-Type': 'application/json'
  }
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// Reintentos con backoff para errores transitorios (5xx, 429, timeouts)
async function postWithRetry(path, payload, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const resp = await client.post(path, payload);
      return resp;
    } catch (err) {
      const status = err.response?.status;
      const retriable =
        status >= 500 ||
        status === 429 ||
        err.code === 'ECONNRESET' ||
        err.code === 'ETIMEDOUT';

      // Log útil para depurar
      console.error('WhatsApp API error:', JSON.stringify(err.response?.data || err.message));

      if (i < retries && retriable) {
        await sleep(250 * Math.pow(2, i)); // 250ms, 500ms, 1s...
        continue;
      }
      throw err;
    }
  }
}

// Meta NO permite \n, \r, \t ni >4 espacios en parámetros de PLANTILLA
function sanitizeTemplateParam(value) {
  if (value == null) return '';
  return String(value)
    .replace(/[\r\n\t]+/g, ' ') // elimina saltos y tabs
    .replace(/\s{2,}/g, ' ')    // colapsa espacios múltiples
    .trim();
}

/**
 * Envía mensaje de texto.
 */
export async function sendTextMessage(to, message) {
  const normalizedTo = normalizePhone(to);
  const payload = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    text: { body: String(message ?? '') }
  };
  const { data } = await postWithRetry('/messages', payload);
  return data;
}

/**
 * Envía un template con variables ya sanitizadas.
 * los parámetros deben ir en una sola línea (sin \n, \t, etc.).
 */
export async function sendTemplate(to, templateName, variables = []) {
  const normalizedTo = normalizePhone(to);

  const payload = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es_MX' }
    }
  };

  if (variables.length) {
    payload.template.components = [
      {
        type: 'body',
        parameters: variables.map(v => ({
          type: 'text',
          text: sanitizeTemplateParam(v)
        }))
      }
    ];
  }

  const { data } = await postWithRetry('/messages', payload);
  return data;
}

/**
 * Ayuda para enviar el resumen con plantilla,
 * y si la plantilla falla por cualquier motivo, hace fallback a texto.
 */
export async function sendOrderSummaryWithFallback(to, listaSingleLine, totalFmt) {
  try {
    await sendTemplate(to, 'detalle_producto', [listaSingleLine, totalFmt]);
  } catch {
    const fallback = `Has seleccionado: ${listaSingleLine}\nTotal: ${totalFmt}`;
    await sendTextMessage(to, fallback);
  }
}

// nueva función para enviar botones dinámicos porque nmeta me bloqueo la cuenta y me limito los que ya tengo
export async function sendInteractiveButtons(to, bodyText, buttons) {
  const normalizedTo = normalizePhone(to);

  const payload = {
    messaging_product: "whatsapp",
    to: normalizedTo,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map(btn => ({
          type: "reply",
          reply: {
            id: btn.id,
            title: btn.title
          }
        }))
      }
    }
  };

  const { data } = await postWithRetry('/messages', payload);
  return data;
}