/**
 * Личный счёт ребёнка — сторона «заработал» (portal_kid_ledger).
 * Сторона «потратил» уже есть отдельно — portalPrizeOps.ts / portal_prize_issuance.
 * Баланс = earned (SUM ledger.amount) - spent (SUM issuance.bongere_price).
 */
import { query, withDbClient } from './db';

export interface KidLedgerEntry {
  id: number;
  kid_id: number | null;
  kid_name: string | null;
  amount: number;
  reason: string;
  source: string;
  shift_day_number: number | null;
  issued_by: string | null;
  created_at: string;
}

export interface KidBalance {
  earned: number;
  spent: number;
  balance: number;
}

export interface KidBalanceRow extends KidBalance {
  kid_id: number;
  kid_name: string;
  room_number: number | null;
}

/** История начислений/списаний. Без kidId — общая лента (для штаба). */
export async function listLedger(kidId?: number, limit = 200): Promise<KidLedgerEntry[]> {
  const where: string[] = [];
  const params: any[] = [];
  if (kidId) { params.push(kidId); where.push(`kid_id = $${params.length}`); }
  params.push(Math.min(500, limit));
  const rows = await query(
    `SELECT id, kid_id, kid_name, amount, reason, source, shift_day_number, issued_by,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at
       FROM portal_kid_ledger
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
    params,
  );
  return (rows ?? []).map((r: any) => ({
    ...r,
    id: Number(r.id),
    kid_id: r.kid_id == null ? null : Number(r.kid_id),
    amount: Number(r.amount),
    shift_day_number: r.shift_day_number == null ? null : Number(r.shift_day_number),
  })) as KidLedgerEntry[];
}

/** Баланс одного ребёнка: заработал / потратил / итого. */
export async function getKidBalance(kidId: number): Promise<KidBalance> {
  const rows = await query(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM portal_kid_ledger WHERE kid_id = $1), 0)::int AS earned,
       COALESCE((SELECT SUM(bongere_price) FROM portal_prize_issuance WHERE kid_id = $1), 0)::int AS spent`,
    [kidId],
  );
  const row = rows?.[0] as any;
  const earned = Number(row?.earned ?? 0);
  const spent = Number(row?.spent ?? 0);
  return { earned, spent, balance: earned - spent };
}

/** Балансы всех активных детей — для рейтинга/списка по комнатам. */
export async function listAllBalances(): Promise<KidBalanceRow[]> {
  const rows = await query(
    `WITH earned AS (
       SELECT kid_id, SUM(amount) AS earned FROM portal_kid_ledger WHERE kid_id IS NOT NULL GROUP BY kid_id
     ), spent AS (
       SELECT kid_id, SUM(bongere_price) AS spent FROM portal_prize_issuance WHERE kid_id IS NOT NULL GROUP BY kid_id
     )
     SELECT k.id AS kid_id, k.name AS kid_name, k.room_number,
            COALESCE(e.earned, 0)::int AS earned,
            COALESCE(s.spent, 0)::int AS spent,
            (COALESCE(e.earned, 0) - COALESCE(s.spent, 0))::int AS balance
       FROM portal_kid k
       LEFT JOIN earned e ON e.kid_id = k.id
       LEFT JOIN spent s ON s.kid_id = k.id
      WHERE k.active = TRUE
      ORDER BY balance DESC, k.name`,
  );
  return (rows ?? []).map((r: any) => ({
    ...r,
    kid_id: Number(r.kid_id),
    room_number: r.room_number == null ? null : Number(r.room_number),
  })) as KidBalanceRow[];
}

export async function createLedgerEntry(p: {
  kid_id: number;
  kid_name?: string | null;
  amount: number;
  reason: string;
  source?: string;
  shift_day_number?: number | null;
  issued_by?: string | null;
}): Promise<number> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `INSERT INTO portal_kid_ledger (kid_id, kid_name, amount, reason, source, shift_day_number, issued_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [p.kid_id, p.kid_name ?? null, p.amount, p.reason, p.source ?? 'manual',
       p.shift_day_number ?? null, p.issued_by ?? null],
    );
    return Number(q.rows[0].id);
  });
  return r ?? 0;
}

export async function deleteLedgerEntry(id: number): Promise<void> {
  await query(`DELETE FROM portal_kid_ledger WHERE id = $1`, [id]);
}
