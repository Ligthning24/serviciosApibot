// src/state/session.store.js
// Sencillo almacenamiento en memoria por usuario (clave = phone).
// Estructura de sesión: { cart: Map<number, number> }

const sessions = new Map();

/** Obtiene o crea la sesión para un número */
export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { cart: new Map() });
  }
  return sessions.get(phone);
}

/** Elimina por completo la sesión del usuario (vacía carrito) */
export function clearSession(phone) {
  sessions.delete(phone);
}

/**Limpia solo el carrito, conservando la sesión */
export function clearCart(phone) {
  const s = sessions.get(phone);
  if (s) s.cart = new Map();
}
