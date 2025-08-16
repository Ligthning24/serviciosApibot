// Mínima “sesión” en memoria por usuario (from)
const sessions = new Map();

/**
 * Obtiene o crea la sesión de un usuario.
 * Estructura:
 * { cart: Map<productId, qty> }
 */
export function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { cart: new Map() });
  }
  return sessions.get(phone);
}

export function clearSession(phone) {
  sessions.delete(phone);
}
