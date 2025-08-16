import { Router } from 'express';
import { handleWebhook, verifyWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// GET para verificación de webhook con Meta
router.get('/webhook', verifyWebhook);

// POST para recibir mensajes/eventos
router.post('/webhook', handleWebhook);

export default router;
