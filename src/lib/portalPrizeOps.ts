/**
 * Серверные операции над призами: журнал выдач + кастомный каталог.
 */

export interface PrizeIssuance {
  id: number;
  prize_id: string;
  prize_name: string | null;
  kid_id: number | null;
  kid_name: string | null;
  issued_by: string | null;
  issued_at: string;
  photo_url: string | null;
  video_url: string | null;
  note: string | null;
  bongere_price: number | null;
}

export interface PrizeCustom {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  ozon_price: number | null;
  qty: number;
  img_url: string | null;
  archived: boolean;
  created_at: string;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

// ── Custom prizes ──────────────────────────────────────────────────────────

export async function listCustomPrizes(): Promise<PrizeCustom[]> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT id, slug, name, description, category, ozon_price, qty, img_url, archived,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at
         FROM portal_prize_custom
         WHERE archived = FALSE
         ORDER BY created_at DESC`
    );
    return q.rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      ozon_price: r.ozon_price == null ? null : Number(r.ozon_price),
      qty: Number(r.qty),
    })) as PrizeCustom[];
  });
  return r ?? [];
}

export async function createCustomPrize(p: {
  name: string;
  description?: string | null;
  category?: string | null;
  ozon_price?: number | null;
  qty?: number;
  img_url?: string | null;
}): Promise<{ id: number; slug: string }> {
  const slug = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const r = await withClient(async (c) => {
    const q = await c.query(
      `INSERT INTO portal_prize_custom (slug, name, description, category, ozon_price, qty, img_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [slug, p.name, p.description ?? null, p.category ?? null, p.ozon_price ?? null, p.qty ?? 1, p.img_url ?? null]
    );
    return { id: Number(q.rows[0].id), slug };
  });
  return r ?? { id: 0, slug: '' };
}

export async function archiveCustomPrize(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE portal_prize_custom SET archived = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
  });
}

// ── Issuances ──────────────────────────────────────────────────────────────

export async function listIssuances(prizeId?: string, limit = 200): Promise<PrizeIssuance[]> {
  const r = await withClient(async (c) => {
    const where: string[] = [];
    const params: any[] = [];
    if (prizeId) { params.push(prizeId); where.push(`prize_id = $${params.length}`); }
    params.push(limit);
    const q = await c.query(
      `SELECT id, prize_id, prize_name, kid_id, kid_name, issued_by, photo_url, video_url, note, bongere_price,
              to_char(issued_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS issued_at
         FROM portal_prize_issuance
         ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
         ORDER BY issued_at DESC
         LIMIT $${params.length}`,
      params
    );
    return q.rows.map((r: any) => ({
      ...r,
      id: Number(r.id),
      kid_id: r.kid_id == null ? null : Number(r.kid_id),
      bongere_price: r.bongere_price == null ? null : Number(r.bongere_price),
    })) as PrizeIssuance[];
  });
  return r ?? [];
}

export async function countIssuancesByPrize(): Promise<Record<string, number>> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT prize_id, count(*)::int AS cnt
         FROM portal_prize_issuance
         GROUP BY prize_id`
    );
    const map: Record<string, number> = {};
    for (const row of q.rows) map[String(row.prize_id)] = Number(row.cnt);
    return map;
  });
  return r ?? {};
}

export async function createIssuance(p: {
  prize_id: string;
  prize_name?: string | null;
  kid_id?: number | null;
  kid_name?: string | null;
  issued_by?: string | null;
  photo_url?: string | null;
  video_url?: string | null;
  note?: string | null;
  bongere_price?: number | null;
}): Promise<number> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `INSERT INTO portal_prize_issuance (prize_id, prize_name, kid_id, kid_name, issued_by, photo_url, video_url, note, bongere_price)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [p.prize_id, p.prize_name ?? null, p.kid_id ?? null, p.kid_name ?? null, p.issued_by ?? null,
       p.photo_url ?? null, p.video_url ?? null, p.note ?? null, p.bongere_price ?? null]
    );
    return Number(q.rows[0].id);
  });
  return r ?? 0;
}

export async function deleteIssuance(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`DELETE FROM portal_prize_issuance WHERE id = $1`, [id]);
  });
}

/** Удалить ВСЕ выдачи (для админского сброса тестовых данных). */
export async function deleteAllIssuances(): Promise<number> {
  return (await withClient(async (c) => {
    const r = await c.query(`DELETE FROM portal_prize_issuance`);
    return r.rowCount ?? 0;
  })) ?? 0;
}
