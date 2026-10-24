// src/lib/db.ts
// Один разделяемый pg.Pool для всего SSR-процесса.
// Astro Node.js adapter запускается как единый long-running процесс,
// поэтому Pool живёт всё время работы сервера.
import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || process.env.DATABASE_URL;
  if (!dsn) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: dsn,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 5_000,
    });
    pool.on('error', (err) => console.error('[pg pool] idle client error', err));
  }
  return pool;
}

/** Выполнить запрос через пул. Возвращает null если нет DSN. */
export async function query<T = any>(sql: string, params?: any[]): Promise<T[] | null> {
  const p = getPool();
  if (!p) return null;
  const r = await p.query(sql, params);
  return r.rows as T[];
}

/**
 * Выделенный клиент из общего пула — для транзакций (BEGIN/COMMIT/ROLLBACK),
 * где нужен один и тот же коннект на все запросы подряд. В отличие от
 * отдельного `new pg.Client()`, НЕ открывает новое TCP-подключение — берёт
 * клиента из pool.connect() и возвращает его обратно через release()
 * (вместо end(), который закрыл бы соединение насовсем).
 * Возвращает null если нет DSN — как и query().
 */
export async function withDbClient<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T | null> {
  const p = getPool();
  if (!p) return null;
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
