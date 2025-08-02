// parseSeleccion.js
export function parseSeleccion(text) {
  const PRODUCTOS = {
    '1': { nombre: 'Refresco', precio: 25 },
    '2': { nombre: 'Coctel grande', precio: 130 },
    '3': { nombre: 'Coctel chico', precio: 90 },
    '4': { nombre: 'Tostada', precio: 60 }
  };
  const items = text.split(',').map(s => s.trim());
  const conteo = items.reduce((acc, idx) => {
    acc[idx] = (acc[idx] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(conteo).map(([idx, qty]) => ({
    producto: PRODUCTOS[idx].nombre,
    cantidad: qty,
    precio: PRODUCTOS[idx].precio
  }));
}