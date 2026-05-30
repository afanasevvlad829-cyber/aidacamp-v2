// Дисциплина сотрудников: штрафы, причины, авто-детекторы.
// Изолирован от детской игровой экономики (portal_prize_*).

export type PenaltyStatus = 'proposed' | 'confirmed' | 'contested' | 'cancelled' | 'paid';
export type PenaltySource = 'auto' | 'manual';

export interface PenaltyReason {
  code: string;
  title: string;
  default_rub: number;
  description: string | null;
  active: boolean;
}

export interface Penalty {
  id: number;
  staff_id: number;
  staff_name: string | null;
  staff_role: string | null;
  shift_id: number | null;
  event_id: number | null;
  event_title: string | null;
  event_date: string | null;
  reason_code: string;
  reason_title: string;
  reason_text: string | null;
  amount_rub: number;
  source: PenaltySource;
  status: PenaltyStatus;
  created_at: string;
  created_by: number | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancelled_note: string | null;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

const SELECT_PENALTY = `
  SELECT p.id, p.staff_id, s.full_name AS staff_name, s.role AS staff_role,
         p.shift_id, p.event_id, e.title AS event_title, e.date::text AS event_date,
         p.reason_code, r.title AS reason_title, p.reason_text,
         p.amount_rub, p.source, p.status,
         p.created_at, p.created_by,
         p.confirmed_at, p.cancelled_at, p.cancelled_note
    FROM portal_penalty p
    JOIN portal_staff s          ON s.id = p.staff_id
    JOIN portal_penalty_reason r ON r.code = p.reason_code
    LEFT JOIN shift_event e      ON e.id = p.event_id
`;

// ── Reasons (словарь) ──────────────────────────────────────────
export async function getReasons(): Promise<PenaltyReason[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      'SELECT code, title, default_rub, description, active FROM portal_penalty_reason WHERE active=TRUE ORDER BY default_rub DESC'
    );
    return r.rows as PenaltyReason[];
  })) ?? [];
}

// ── CRUD ───────────────────────────────────────────────────────
export interface ListFilter {
  staff_id?: number;
  shift_id?: number;
  status?: PenaltyStatus | 'open';   // 'open' = proposed+confirmed
  limit?: number;
}

export async function listPenalties(f: ListFilter = {}): Promise<Penalty[]> {
  return (await withClient(async (c) => {
    const where: string[] = [];
    const vals: unknown[] = [];
    if (f.staff_id) { vals.push(f.staff_id); where.push(`p.staff_id=$${vals.length}`); }
    if (f.shift_id) { vals.push(f.shift_id); where.push(`p.shift_id=$${vals.length}`); }
    if (f.status === 'open') where.push(`p.status IN ('proposed','confirmed')`);
    else if (f.status)       { vals.push(f.status); where.push(`p.status=$${vals.length}::penalty_status_enum`); }
    const limit = Math.max(1, Math.min(500, f.limit ?? 200));
    const sql = `${SELECT_PENALTY}${where.length ? ' WHERE ' + where.join(' AND ') : ''}
                 ORDER BY p.created_at DESC LIMIT ${limit}`;
    const r = await c.query(sql, vals);
    return r.rows as Penalty[];
  })) ?? [];
}

export async function getPenalty(id: number): Promise<Penalty | null> {
  return (await withClient(async (c) => {
    const r = await c.query(`${SELECT_PENALTY} WHERE p.id=$1`, [id]);
    return (r.rows[0] as Penalty) ?? null;
  })) ?? null;
}

export interface CreateInput {
  staff_id: number;
  shift_id?: number | null;
  event_id?: number | null;
  reason_code: string;
  reason_text?: string | null;
  amount_rub?: number;       // если не указан — берём default_rub из словаря
  source?: PenaltySource;
  status?: PenaltyStatus;
  dedup_key?: string | null;
  created_by?: number | null;
}

export async function createPenalty(inp: CreateInput): Promise<number | null> {
  return await withClient(async (c) => {
    const reason = await c.query(
      'SELECT default_rub FROM portal_penalty_reason WHERE code=$1 AND active=TRUE',
      [inp.reason_code],
    );
    if (reason.rowCount === 0) throw new Error(`unknown reason: ${inp.reason_code}`);
    const amount = inp.amount_rub ?? reason.rows[0].default_rub;
    try {
      const r = await c.query(
        `INSERT INTO portal_penalty (staff_id, shift_id, event_id, reason_code, reason_text,
                                     amount_rub, source, status, dedup_key, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::penalty_source_enum,$8::penalty_status_enum,$9,$10)
         RETURNING id`,
        [inp.staff_id, inp.shift_id ?? null, inp.event_id ?? null,
         inp.reason_code, inp.reason_text ?? null, amount,
         inp.source ?? 'manual', inp.status ?? 'proposed',
         inp.dedup_key ?? null, inp.created_by ?? null],
      );
      const id = r.rows[0].id as number;
      await c.query(
        `INSERT INTO portal_penalty_log (penalty_id, actor_id, action, payload)
         VALUES ($1,$2,'created',$3::jsonb)`,
        [id, inp.created_by ?? null, JSON.stringify({ source: inp.source ?? 'manual', amount })],
      );
      return id;
    } catch (e: unknown) {
      // unique dedup_key — игнорируем (детектор уже сработал)
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === '23505') return null;
      throw e;
    }
  });
}

export async function confirmPenalty(id: number, actorId: number, amountOverride?: number): Promise<void> {
  await withClient(async (c) => {
    if (typeof amountOverride === 'number') {
      await c.query('UPDATE portal_penalty SET amount_rub=$2 WHERE id=$1 AND status IN (\'proposed\',\'contested\')',
        [id, amountOverride]);
    }
    await c.query(
      `UPDATE portal_penalty SET status='confirmed', confirmed_by=$2, confirmed_at=now()
       WHERE id=$1 AND status IN ('proposed','contested')`,
      [id, actorId],
    );
    await c.query(
      `INSERT INTO portal_penalty_log (penalty_id, actor_id, action, payload)
       VALUES ($1,$2,'confirmed',$3::jsonb)`,
      [id, actorId, JSON.stringify({ amount_override: amountOverride ?? null })],
    );
  });
}

export async function cancelPenalty(id: number, actorId: number, note: string): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `UPDATE portal_penalty SET status='cancelled', cancelled_by=$2, cancelled_at=now(), cancelled_note=$3
       WHERE id=$1 AND status IN ('proposed','confirmed','contested')`,
      [id, actorId, note],
    );
    await c.query(
      `INSERT INTO portal_penalty_log (penalty_id, actor_id, action, payload)
       VALUES ($1,$2,'cancelled',$3::jsonb)`,
      [id, actorId, JSON.stringify({ note })],
    );
  });
}

export async function markPaid(id: number, actorId: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `UPDATE portal_penalty SET status='paid', paid_at=now() WHERE id=$1 AND status='confirmed'`,
      [id],
    );
    await c.query(
      `INSERT INTO portal_penalty_log (penalty_id, actor_id, action) VALUES ($1,$2,'paid')`,
      [id, actorId],
    );
  });
}

// ── Auto-detectors ─────────────────────────────────────────────

export interface ScanResult {
  scanned: number;
  created: number;
  reasons: Record<string, number>;
}

/**
 * Сканер «событие закончилось + 30 мин, но осталось pending».
 * Срабатывает на:
 *   - незакрытые event_content_task (status='pending')
 *   - незакрытые элементы event_checklist (нет соответствующей записи в checklist_done)
 * Штрафует ответственного (shift_event.responsible_staff_id).
 * Использует dedup_key = `<reason>:event=<id>` — повторно не создаётся.
 */
export async function scanOverdueEvents(graceMinutes = 30): Promise<ScanResult> {
  const out: ScanResult = { scanned: 0, created: 0, reasons: {} };
  await withClient(async (c) => {
    const r = await c.query(
      `WITH due_events AS (
         SELECT e.id, e.shift_id, e.responsible_staff_id, e.title, e.date
           FROM shift_event e
          WHERE e.responsible_staff_id IS NOT NULL
            AND e.end_time IS NOT NULL
            AND (e.date::timestamp + e.end_time + ($1::int || ' minutes')::interval) < now()
            AND e.date >= (CURRENT_DATE - INTERVAL '14 days')   -- не сканируем глубокое прошлое
       )
       SELECT de.*,
              EXISTS(
                SELECT 1 FROM event_content_task t
                 WHERE t.event_id = de.id AND t.status = 'pending'
              ) AS has_pending_task,
              EXISTS(
                SELECT 1 FROM event_checklist ec
                 WHERE ec.event_id = de.id
                   AND NOT EXISTS(
                     SELECT 1 FROM checklist_done cd
                      WHERE cd.event_id = de.id
                        AND cd.checklist_id = ec.checklist_id
                   )
              ) AS has_open_checklist
         FROM due_events de`,
      [graceMinutes],
    );
    out.scanned = r.rowCount ?? 0;
    for (const row of r.rows) {
      // missing_photo приоритетнее checklist_overdue: если оба горят, ставим один штраф
      const reason = row.has_pending_task ? 'missing_photo'
                  : row.has_open_checklist ? 'checklist_overdue'
                  : null;
      if (!reason) continue;
      const dedup = `${reason}:event=${row.id}`;
      const created = await createPenalty({
        staff_id: row.responsible_staff_id,
        shift_id: row.shift_id,
        event_id: row.id,
        reason_code: reason,
        source: 'auto',
        status: 'proposed',
        dedup_key: dedup,
      });
      if (created != null) {
        out.created++;
        out.reasons[reason] = (out.reasons[reason] ?? 0) + 1;
      }
    }
  });
  return out;
}

/**
 * Сканер «событие без ответственного на сегодня».
 * Штрафует руководителя смены (берём из portal_staff WHERE staff_key='director' и в этой смене).
 * dedup_key = `event_unassigned:event=<id>` — один раз за событие.
 */
export async function scanUnassignedEvents(): Promise<ScanResult> {
  const out: ScanResult = { scanned: 0, created: 0, reasons: {} };
  await withClient(async (c) => {
    const r = await c.query(
      `SELECT e.id, e.shift_id
         FROM shift_event e
        WHERE e.responsible_staff_id IS NULL
          AND e.date = CURRENT_DATE`
    );
    out.scanned = r.rowCount ?? 0;
    // Руководитель смены — staff_key='director' и активный
    const dir = await c.query(
      `SELECT id FROM portal_staff
        WHERE staff_key='director' AND active=TRUE LIMIT 1`,
    );
    if (dir.rowCount === 0) return; // некому штрафовать
    const directorId = dir.rows[0].id as number;
    for (const row of r.rows) {
      const dedup = `event_unassigned:event=${row.id}`;
      const created = await createPenalty({
        staff_id: directorId,
        shift_id: row.shift_id,
        event_id: row.id,
        reason_code: 'event_unassigned',
        source: 'auto',
        status: 'proposed',
        dedup_key: dedup,
      });
      if (created != null) {
        out.created++;
        out.reasons['event_unassigned'] = (out.reasons['event_unassigned'] ?? 0) + 1;
      }
    }
  });
  return out;
}

/**
 * Сканер «не отметился на подъёме».
 * Для каждого события event_type='wakeup', закончившегося ≥ graceMinutes назад,
 * штрафует тех активных staff, у кого нет записи в event_self_check.
 * dedup_key = `wakeup_missed:event=<id>:staff=<sid>`.
 */
export async function scanWakeupMissed(graceMinutes = 30): Promise<ScanResult> {
  const out: ScanResult = { scanned: 0, created: 0, reasons: {} };
  await withClient(async (c) => {
    const r = await c.query(
      `WITH due AS (
         SELECT e.id, e.shift_id
           FROM shift_event e
          WHERE e.event_type = 'wakeup'
            AND e.end_time IS NOT NULL
            AND (e.date::timestamp + e.end_time + ($1::int || ' minutes')::interval) < now()
            AND e.date >= (CURRENT_DATE - INTERVAL '14 days')
       )
       SELECT due.id event_id, due.shift_id, s.id staff_id
         FROM due
         JOIN portal_staff s ON s.active = TRUE
        WHERE NOT EXISTS (
                SELECT 1 FROM event_self_check esc
                 WHERE esc.event_id = due.id AND esc.staff_id = s.id
              )`,
      [graceMinutes],
    );
    out.scanned = r.rowCount ?? 0;
    for (const row of r.rows) {
      const dedup = `wakeup_missed:event=${row.event_id}:staff=${row.staff_id}`;
      const created = await createPenalty({
        staff_id: Number(row.staff_id),
        shift_id: row.shift_id,
        event_id: Number(row.event_id),
        reason_code: 'wakeup_missed',
        source: 'auto',
        status: 'proposed',
        dedup_key: dedup,
      });
      if (created != null) {
        out.created++;
        out.reasons['wakeup_missed'] = (out.reasons['wakeup_missed'] ?? 0) + 1;
      }
    }
  });
  return out;
}

/** Все сканеры разом — для cron. */
export async function runAllScanners(graceMinutes = 30): Promise<Record<string, ScanResult>> {
  return {
    overdue:    await scanOverdueEvents(graceMinutes),
    unassigned: await scanUnassignedEvents(),
    wakeup:     await scanWakeupMissed(graceMinutes),
  };
}
