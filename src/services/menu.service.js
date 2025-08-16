import { pool } from '../config/db.js';

/**
 * Devuelve el menú en formato texto.
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
      menuText += `${p.id_producto}. ${p.nombre} - $${p.precio}\n`;
    });

    menuText += '\nResponde con los números separados por coma (ej. 1,2,3).';
    return menuText;
  } catch (err) {
    console.error('Error consultando menú:', err);
    return 'Error al consultar el menú. Intente más tarde.';
  }
}

/**
 * Obtiene productos por lista de IDs separados por coma "1,2,3"
 */
export async function getProductsByIds(idsCsv) {
  // Sanitiza lista simple de enteros:
  const ids = idsCsv
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
    .map(Number)
    .filter(n => Number.isInteger(n));

  if (ids.length === 0) return [];

  // Construye placeholders $1,$2...
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  const sql = `SELECT id_producto, nombre, precio FROM productos WHERE id_producto IN (${placeholders})`;

  const { rows } = await pool.query(sql, ids);
  return rows;
}

// ====== NUEVO: parsea "1,2,1,4" a un mapa de cantidades por id ======
export function parseIdsToCounts(idsCsv) {
  const counts = new Map();
  if (!idsCsv) return counts;

  // guarda también el primer índice de aparición para mantener el orden de selección
  const orderIndex = new Map();

  idsCsv.split(',').forEach((s, idx) => {
    const n = Number(String(s).trim());
    if (Number.isInteger(n)) {
      counts.set(n, (counts.get(n) || 0) + 1);
      if (!orderIndex.has(n)) orderIndex.set(n, idx);
    }
  });

  return { counts, orderIndex };
}

// ====== NUEVO: consulta productos por ids únicos y devuelve items con qty y totales ======
export async function getProductsWithQty(idsCsv) {
  const parsed = parseIdsToCounts(idsCsv);
  const counts = parsed.counts;
  const orderIndex = parsed.orderIndex;

  if (!counts || counts.size === 0) {
    return { items: [], total: 0 };
  }

  const uniqueIds = Array.from(counts.keys());
  const placeholders = uniqueIds.map((_, i) => `$${i + 1}`).join(',');
  const sql = `SELECT id_producto, nombre, precio FROM productos WHERE id_producto IN (${placeholders})`;

  const { rows } = await pool.query(sql, uniqueIds);

  // arma items con qty, lineTotal y ordena por primer aparición en el texto del usuario
  const items = rows
    .map(r => {
      const qty = counts.get(r.id_producto) || 0;
      const price = Number(r.precio);
      return {
        id: r.id_producto,
        nombre: r.nombre,
        precio: price,
        qty,
        lineTotal: price * qty,
        firstIndex: orderIndex.get(r.id_producto) ?? 999999
      };
    })
    .filter(it => it.qty > 0)
    .sort((a, b) => a.firstIndex - b.firstIndex);

  const total = items.reduce((acc, it) => acc + it.lineTotal, 0);

  return { items, total };
}

// ====== NUEVO: formateo del listado para WhatsApp (con saltos de línea y xN) ======
export function formatOrderList(items) {
  if (!items?.length) return '';
  return items
    .map(it => `${it.nombre} $${it.precio.toFixed(2)} - x${it.qty}`)
    .join(',\n');
}

