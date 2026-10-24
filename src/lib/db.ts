// src/lib/db.ts
// Один разделяемый pg.Pool для всего SSR-процесса.
// Astro Node.js adapter запускается как единый long-running процесс,
// поэтому Pool живёт всё время работы сервера.

let pool: import('pg').Pool | null = null;

export function getPool(): import('pg').Pool | null {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN;
  if (!dsn) return null;
  if (!pool) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    pool = new Pool({
      connectionString: dsn,
      max: 10,              // максимум 10 соединений
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    pool!.on('error', (err) => console.error('[pg pool] idle client error', err));
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
