// src/lib/db.ts
// Один разделяемый pg.Pool для всего SSR-процесса.
// Astro Node.js adapter запускается как единый long-running процесс,
// поэтому Pool живёт всё время работы сервера.
import pg from 'pg';

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN;
  if (!dsn) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: dsn,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
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
