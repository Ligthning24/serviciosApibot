import express from 'express';
import { config } from 'dotenv';
import pg from 'pg';
import axios from 'axios';

config();

const app = express();
app.use(express.json());

// Conexión a PostgreSQL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  //ssl: { rejectUnauthorized: false }
});

// Ruta simple
app.get('/', (req, res) => {
  res.send('Servidor activo ✅');
});

// ====== WEBHOOK GET ======
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook verificado');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// ====== WEBHOOK POST ======
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object) {
    const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
    if (messages && messages.length > 0) {
      const msg = messages[0];
      const from = msg.from; // Número del usuario
      const text = msg.text?.body || '';

      console.log(`📩 Mensaje de ${from}: ${text}`);

      if (text.toLowerCase() === 'menu') {
        const menu = await getMenu();
        await sendTextMessage(from, menu);
      } else {
        await sendTextMessage(from, 'Escribe "menu" para ver nuestros productos.');
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// ====== FUNCIÓN PARA CONSULTAR MENÚ ======
async function getMenu() {
  try {
    const result = await pool.query(
      'SELECT id_producto, nombre, precio FROM productos WHERE disponible = true ORDER BY id_producto'
    );

    if (result.rows.length === 0) {
      return 'Por el momento no hay productos disponibles.';
    }

    let menuText = '📋 *Menú disponible:*\n';
    result.rows.forEach(p => {
      menuText += `${p.id_producto}. ${p.nombre} - $${p.precio}\n`;
    });

    return menuText;
  } catch (err) {
    console.error('Error consultando menú:', err);
    return 'Error al consultar el menú. Intente más tarde.';
  }
}

// ====== FUNCIÓN PARA ENVIAR MENSAJE ======
function normalizePhone(number) {
  // Si empieza con 52 y no tiene el 1 después, se lo agregamos
  if (number.startsWith("52") && !number.startsWith("521")) {
    return "521" + number.slice(2);
  }
  return number;
}

async function sendTextMessage(to, message) {
  const normalizedTo = normalizePhone(to);
  console.log("Enviando a:", normalizedTo);
  
  try {
    await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: normalizedTo,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
    console.log(`✅ Mensaje enviado a ${normalizedTo}`);
  } catch (error) {
    console.error("❌ Error enviando mensaje:", error.response?.data || error.message);
  }
}

app.listen(3000, () => {
  console.log('🚀 Servidor corriendo en puerto 3000');
});
