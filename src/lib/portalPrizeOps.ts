/**
 * Серверные операции над призами: журнал выдач + кастомный каталог.
 */
import { withDbClient } from './db';

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
  url: string | null;
  archived: boolean;
  is_base?: boolean;
  created_at: string;
}

// ── Custom prizes ──────────────────────────────────────────────────────────

export async function listCustomPrizes(): Promise<PrizeCustom[]> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `SELECT id, slug, name, description, category, ozon_price, qty, img_url, url, archived,
              COALESCE(is_base, FALSE) AS is_base,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at
         FROM portal_prize_custom
         WHERE archived = FALSE
         ORDER BY is_base DESC, created_at DESC`
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
  const r = await withDbClient(async (c) => {
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
  await withDbClient(async (c) => {
    await c.query(`UPDATE portal_prize_custom SET archived = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
  });
}

// ── Issuances ──────────────────────────────────────────────────────────────

export async function listIssuances(prizeId?: string, limit = 200): Promise<PrizeIssuance[]> {
  const r = await withDbClient(async (c) => {
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
  const r = await withDbClient(async (c) => {
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
  const r = await withDbClient(async (c) => {
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
  await withDbClient(async (c) => {
    await c.query(`DELETE FROM portal_prize_issuance WHERE id = $1`, [id]);
  });
}

/** Удалить ВСЕ выдачи (для админского сброса тестовых данных). */
export async function deleteAllIssuances(): Promise<number> {
  return (await withDbClient(async (c) => {
    const r = await c.query(`DELETE FROM portal_prize_issuance`);
    return r.rowCount ?? 0;
  })) ?? 0;
}

/** Обновить данные выдачи (kid, цена, заметка; фото/видео заменяются только если переданы). */
export async function updateIssuance(id: number, p: {
  kid_id?: number | null;
  kid_name?: string | null;
  bongere_price?: number | null;
  note?: string | null;
  photo_url?: string | null;
  video_url?: string | null;
}): Promise<void> {
  await withDbClient(async (c) => {
    const sets: string[] = [];
    const vals: any[] = [];
    const push = (col: string, val: any) => { vals.push(val); sets.push(`${col} = $${vals.length}`); };
    if ('kid_id'       in p) push('kid_id',       p.kid_id ?? null);
    if ('kid_name'     in p) push('kid_name',     p.kid_name ?? null);
    if ('bongere_price' in p) push('bongere_price', p.bongere_price ?? null);
    if ('note'         in p) push('note',         p.note ?? null);
    if ('photo_url'    in p && p.photo_url !== undefined) push('photo_url', p.photo_url);
    if ('video_url'    in p && p.video_url !== undefined) push('video_url', p.video_url);
    if (!sets.length) return;
    vals.push(id);
    await c.query(`UPDATE portal_prize_issuance SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
  });
}
