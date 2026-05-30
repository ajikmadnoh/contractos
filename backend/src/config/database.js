const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('Query executed:', { text, duration, rows: res.rowCount });
  }
  return res;
};

const getClient = () => pool.connect();

// Run a set of statements on a single pooled connection inside one transaction.
// Acquires a dedicated client (so BEGIN/COMMIT can't land on different
// connections), commits on success, rolls back on any error, and always
// releases the client. The callback receives a `query(text, params)` bound to
// that client.
const withTransaction = async (fn) => {
  const client = await pool.connect();
  const q = (text, params) => client.query(text, params);
  try {
    await client.query('BEGIN');
    const result = await fn(q, client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* connection already broken */ }
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { query, getClient, withTransaction, pool };
