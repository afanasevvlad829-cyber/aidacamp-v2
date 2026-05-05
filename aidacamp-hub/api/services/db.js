const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      user: process.env.DB_USER || 'aidacamp_app',
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST || '159.194.223.55',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'aidacamp_hub',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    pool.on('error', (err) => {
      console.error('Unexpected pool error:', err.message);
    });
  }
  return pool;
}

async function query(text, params) {
  const pool = getPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('DB query error:', error.message);
    throw error;
  }
}

module.exports = { getPool, query };
