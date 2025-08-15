const axios = require("axios");
const fs = require("fs");

const accessToken = "EAAShJ5e5ZCUwBPPQfTPylHlvznlHsxliakYpvz7rSMZAIlYmSuSv3Hmh0I00rfVJDTyCRg7B9jS32QfupHnZCuN3XICpjxxGpIswZCGyfuI7h3TJepDj3jue9hHc6byECm64jUVZCZCKtGvaws2lhekmtaO0ZCnzLGZALAGulOCcSlykh9GPOaBZBzJLEsZCg3qQZDZD";
const phoneNumberId = "779866748540906";

function procesarNumero(to) {
  if (!to) throw new Error("Número de destinatario no válido");
  return to.startsWith("521") ? to.replace(/^521/, "52") : to;
}

async function enviarPayload(to, templateName, components = []) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  to = procesarNumero(to);

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "es_MX" },
      components,
    },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    logExitoso(payload, response.data);
  } catch (error) {
    logError(payload, error);
  }
}

async function enviarPlantillaWhatsApp(to, templateName, text = "") {
  const components = text
    ? [
        {
          type: "body",
          parameters: [{ type: "text", text }],
        },
      ]
    : [];
  await enviarPayload(to, templateName, components);
}

async function enviarMensajeTexto(to, text) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: procesarNumero(to),
    type: "text",
    text: { body: text },
  };

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    logExitoso(payload, response.data);
  } catch (error) {
    logError(payload, error);
  }
}

function logExitoso(payload, responseData) {
  const logMessage = `${new Date().toISOString()} - Enviado: ${JSON.stringify(payload)}\nRespuesta: ${JSON.stringify(responseData)}\n`;
  fs.appendFileSync("template_log.txt", logMessage);
}

function logError(payload, error) {
  const errorData = error.response?.data || error.message;
  const logMessage = `${new Date().toISOString()} - Error enviando: ${JSON.stringify(payload)}\nError: ${JSON.stringify(errorData)}\n`;
  fs.appendFileSync("template_log.txt", logMessage);
}

module.exports = {
  enviarPlantillaWhatsApp,
  enviarMensajeTexto,
};
