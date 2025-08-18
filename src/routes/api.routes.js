import { Router } from 'express';
import { getProductsByIds } from '../services/menu.service.js';

const router = Router();

/**
 * Endpoint que es opcional por para exponer productos usando API
 * GET /api/productos?ids=1,2,3
 */
router.get('/productos', async (req, res) => {
  try {
    const ids = String(req.query.ids || '');
    if (!ids) return res.json([]);

    const products = await getProductsByIds(ids);
    return res.json(products);
  } catch (e) {
    console.error('Error en /api/productos', e);
    return res.status(500).json({ error: 'Error consultando productos' });
  }
});

export default router;
