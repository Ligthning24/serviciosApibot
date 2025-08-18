// src/services/menu.service.js
import { pool } from '../config/db.js';

/**
 * Devuelve el menú en formato texto para WhatsApp.
 */
export async function getMenuText() {
  try {
    const result = await pool.query(
      'SELECT id_producto, nombre, precio FROM productos WHERE disponible = true ORDER BY id_producto'
    );

    if (result.rows.length === 0) {
      return 'Por el momento no hay productos disponibles.';
    }

    let menuText = '📋 *Menú disponible:*\n';
    result.rows.forEach(p => {
      const precio = Number(p.precio) || 0;
      menuText += `${p.id_producto}. ${p.nombre} - $${precio.toFixed(2)}\n`;
    });

    menuText += '\nResponde con los números separados por coma (ej. 1,2,3).';
    return menuText;
  } catch (err) {
    console.error('Error consultando menú:', err);
    return 'Error al consultar el menú. Intente más tarde.';
  }
}

/**
 * (Para /api/productos) Obtiene productos por lista CSV de IDs: "1,2,3"
 */
export async function getProductsByIds(idsCsv) {
  const ids = String(idsCsv || '')
    .split(',')
    .map(s => Number(String(s).trim()))
    .filter(n => Number.isInteger(n));

  if (ids.length === 0) return [];

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const sql = `SELECT id_producto, nombre, precio
               FROM productos
               WHERE id_producto IN (${placeholders})
               ORDER BY id_producto`;

  const { rows } = await pool.query(sql, ids);
  return rows;
}

/**
 * Parsea "1,2,1,4" a Map<id, qty>
 */
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

/**
 * Suma cantidades de addMap sobre baseMap (ambos Map<number, number>)
 * Devuelve el mismo Map de base (mutado) para encadenar.
 */
export function mergeCounts(baseMap, addMap) {
  if (!(baseMap instanceof Map)) baseMap = new Map();
  for (const [k, v] of addMap.entries()) {
    baseMap.set(k, (baseMap.get(k) || 0) + v);
  }
  return baseMap;
}

/**
 * Desde un carrito (Map<id, qty>) consulta productos y arma items + total
 * items: [{ id, nombre, precio, qty, lineTotal }]
 */
export async function buildItemsFromCart(counts) {
  if (!(counts instanceof Map) || counts.size === 0) {
    return { items: [], total: 0 };
  }

  const ids = Array.from(counts.keys());
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const sql = `SELECT id_producto, nombre, precio
               FROM productos
               WHERE id_producto IN (${placeholders})`;

  const { rows } = await pool.query(sql, ids);

  const items = rows
    .map(r => {
      const qty = counts.get(r.id_producto) || 0;
      const price = Number(r.precio) || 0;
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

/**
 * Formatea lista multilínea (para mensajes de texto)
 */
export function formatOrderList(items) {
  if (!items?.length) return '';
  return items
    .map(it => `• ${it.nombre} $${it.precio.toFixed(2)} - x${it.qty}`)
    .join('\n');
}

/**
 * Formatea lista en UNA sola línea (para parámetros de plantilla)
 * (Meta no permite \n/\t en parámetros de plantilla)
 */
export function formatOrderListSingleLine(items) {
  if (!items?.length) return '';
  return items
    .map(it => `${it.nombre} $${it.precio.toFixed(2)} - x${it.qty}`)
    .join(' · ');
}
