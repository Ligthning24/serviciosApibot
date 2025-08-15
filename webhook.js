const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const handleIncomingMessage = require("./messageHandling");

router.post("/webhook", async (req, res) => {
  const payload = req.body;

  // Log del payload
  const logsDir = path.join(__dirname, "logs");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logEntry = `${new Date().toISOString()} - WEBHOOK PAYLOAD: ${JSON.stringify(payload)}\n`;
  fs.appendFileSync(path.join(logsDir, "api_log.txt"), logEntry);

  if (
    payload?.object === "whatsapp" ||
    payload?.object === "whatsapp_business_account"
  ) {
    try {
      await handleIncomingMessage(payload);
    } catch (err) {
      console.error("Error en handleIncomingMessage:", err);
    }
  } else {
    console.warn("Payload ignorado: tipo no válido:", payload?.object);
  }

  res.sendStatus(200);
});

module.exports = router;
