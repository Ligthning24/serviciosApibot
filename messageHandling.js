const pool = require("./db");
const fs = require("fs");
const path = require("path");
const { enviarPlantillaWhatsApp } = require("./whatsappTemplates");

// Almacenamiento temporal de pedidos en proceso
const pedidosEnProceso = {};

async function handleIncomingMessage(payload) {
  // Log del request entrante
  fs.appendFileSync(
    "debug_post_log.txt",
    `${new Date().toISOString()} - POST Request: ${JSON.stringify(payload)}\n`
  );

  const firstMessage = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!firstMessage) return;

  const from = firstMessage.from;

  // Manejo de mensaje de texto
  if (firstMessage.type === "text") {
    const body = firstMessage.text?.body?.toLowerCase() || "";

    if (body.includes("hola")) {
      // Saludo inicial
      await enviarPlantillaWhatsApp(from, "saludo_principal", []);
    } else if (body.includes(",")) {
      // Usuario envió IDs de productos separados por coma
      const ids = body.split(",").map(e => e.trim());
      await mostrarDetallePedido(from, ids);
    }
  }

  // Manejo de botones
  else if (firstMessage.type === "button") {
    const payloadBtn = firstMessage.button?.payload?.toLowerCase();

    if (payloadBtn === "ver_productos") {
      await mostrarMenu(from);
    } else if (payloadBtn === "ayuda") {
      await enviarPlantillaWhatsApp(from, "ayuda", []);
    } else if (payloadBtn === "confirmar_pedido") {
      await confirmarPedido(from);
    } else if (payloadBtn === "cancelar_pedido") {
      await enviarPlantillaWhatsApp(from, "pedido_cancelado", []);
    }
  }
}

// Muestra menú desde BD
async function mostrarMenu(from) {
  const { rows } = await pool.query(
    "SELECT id_producto, nombre, precio FROM productos WHERE disponible = true"
  );

  if (rows.length === 0) {
    // No hay productos disponibles
    await enviarPlantillaWhatsApp(from, "menu_vacio", []);
    return;
  }

  const menuTexto = rows
    .map(p => `${p.id_producto}. ${p.nombre} - $${p.precio}`)
    .join("\n");

  await enviarPlantillaWhatsApp(from, "detalle_producto", [
    menuTexto,
    "0" // Total inicial vacío
  ]);
}

// Muestra detalle antes de confirmar
async function mostrarDetallePedido(from, ids) {
  const productos = await pool.query(
    "SELECT id_producto, nombre, precio FROM productos WHERE id_producto = ANY($1::int[])",
    [ids.map(Number)]
  );

  if (productos.rows.length === 0) {
    await enviarPlantillaWhatsApp(from, "menu_vacio", []);
    return;
  }

  const lista = productos.rows
    .map(p => `${p.nombre} - $${p.precio}`)
    .join("\n");

  const total = productos.rows.reduce((sum, p) => sum + Number(p.precio), 0);

  // Guardamos selección temporal
  pedidosEnProceso[from] = productos.rows;

  await enviarPlantillaWhatsApp(from, "detalle_producto", [
    lista,
    total.toString()
  ]);
}

// Guarda pedido en la BD y envía confirmación
async function confirmarPedido(from) {
  const productos = pedidosEnProceso[from];
  if (!productos) {
    await enviarPlantillaWhatsApp(from, "menu_vacio", []);
    return;
  }

  const total = productos.reduce((sum, p) => sum + Number(p.precio), 0);

  const insertPedido = await pool.query(
    "INSERT INTO orden_pedido (total, estado) VALUES ($1, 'PENDIENTE') RETURNING id_compra",
    [total]
  );
  const idCompra = insertPedido.rows[0].id_compra;

  for (let prod of productos) {
    await pool.query(
      "INSERT INTO orden_detalle (id_compra, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)",
      [idCompra, prod.id_producto, 1, prod.precio]
    );
  }

  const lista = productos
    .map(p => `${p.nombre} - $${p.precio}`)
    .join("\n");

  await enviarPlantillaWhatsApp(from, "pedido_confirmado", [
    lista,
    total.toString()
  ]);

  // Limpia el pedido en memoria
  delete pedidosEnProceso[from];
}

module.exports = handleIncomingMessage;
