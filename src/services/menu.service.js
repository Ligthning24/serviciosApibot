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
