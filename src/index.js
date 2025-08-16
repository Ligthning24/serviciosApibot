import express from 'express';
import webhookRoutes from './routes/webhook.routes.js';
import apiRoutes from './routes/api.routes.js';
import { env } from './config/env.js';

const app = express();

// Necesario para leer JSON entrante desde Meta
app.use(express.json({ limit: '1mb' }));

// Ruta simple de salud
app.get('/', (_req, res) => {
  res.send('Servidor activo ✅');
});

// Rutas
app.use('/', webhookRoutes); // /webhook GET/POST
app.use('/api', apiRoutes);  // /api/productos

// Arranque
app.listen(env.port, () => {
  console.log(`🚀 Servidor corriendo en puerto ${env.port}`);
});

export default app;
