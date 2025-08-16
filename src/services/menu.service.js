import { pool } from '../config/db.js';

// Ya existente:
// export async function getMenuText() { ... }
// export function formatOrderList(items) { ... }  // si ya lo tienes, puedes usar el de abajo

export function parseIdsCsvToCounts(idsCsv) {
  const counts = new Map();
  if (!idsCsv) return counts;

  idsCsv.split(',').forEach(s => {
    const n = Number(String(s).trim());
    if (Number.isInteger(n) && n > 0) {
      counts.set(n, (counts.get(n) || 0) + 1);
    }
  });
  return counts;
}

export function mergeCounts(baseMap, addMap) {
  for (const [k, v] of addMap.entries()) {
    baseMap.set(k, (baseMap.get(k) || 0) + v);
  }
  return baseMap;
}

/**
 * Dado un Map<id, qty>, consulta los productos y devuelve items + total
 */
export async function buildItemsFromCart(counts) {
  const ids = Array.from(counts.keys());
  if (!ids.length) return { items: [], total: 0 };

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const sql = `SELECT id_producto, nombre, precio FROM productos WHERE id_producto IN (${placeholders})`;

  const { rows } = await pool.query(sql, ids);

  const items = rows
    .map(r => {
      const qty = counts.get(r.id_producto) || 0;
      const price = Number(r.precio);
      return {
        id: r.id_producto,
        nombre: r.nombre,
        precio: price,
        qty,
        lineTotal: price * qty
      };
    })
    .filter(it => it.qty > 0);

  const total = items.reduce((acc, it) => acc + it.lineTotal, 0);
  return { items, total };
}

export function formatOrderList(items) {
  if (!items?.length) return '';
  return items
    .map(it => `• ${it.nombre} $${it.precio.toFixed(2)} - x${it.qty}`)
    .join('\n');
}
