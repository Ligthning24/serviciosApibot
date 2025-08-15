// db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',      // Cambia si usas otro host
  port: 5432,
  user: 'tu_usuario',     // Cambia por tu usuario de PostgreSQL
  password: 'tu_password',// Cambia por tu password
  database: 'ecommerce'   // Nombre de tu base
});

module.exports = pool;
