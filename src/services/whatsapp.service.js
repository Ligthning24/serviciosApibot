import axios from 'axios';
import { env } from '../config/env.js';
import { normalizePhone } from '../utils/phone.js';

const baseUrl = `https://graph.facebook.com/${env.graphApiVersion}/${env.phoneNumberId}/messages`;

export async function sendTextMessage(to, message) {
  const normalizedTo = normalizePhone(to);

  try {
    const { data } = await axios.post(
      baseUrl,
      {
        messaging_product: 'whatsapp',
        to: normalizedTo,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${env.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`✅ Mensaje enviado a ${normalizedTo}`, data);
    return data;
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
    throw error;
  }
}

export async function sendTemplate(to, templateName, variables = []) {
  const normalizedTo = normalizePhone(to);

  const body = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es_MX' }
    }
  };

  if (variables.length > 0) {
    body.template.components = [
      {
        type: 'body',
        parameters: variables.map(v => ({ type: 'text', text: String(v) }))
      }
    ];
  }

  try {
    const { data } = await axios.post(baseUrl, body, {
      headers: {
        Authorization: `Bearer ${env.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log(`✅ Enviado template "${templateName}" a ${normalizedTo}`, data);
    return data;
  } catch (error) {
    console.error(`❌ Error enviando template "${templateName}":`, error.response?.data || error.message);
    throw error;
  }
}
