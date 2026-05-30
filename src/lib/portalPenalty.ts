// Дисциплина сотрудников: штрафы, причины, авто-детекторы.
// Изолирован от детской игровой экономики (portal_prize_*).

// Telegram: уведомление сотруднику + копия Дарье и Владимиру
const DARYA_TG_ID  = 2040464481;   // Дарья Афанасьева
const OWNER_TG_ID  = 244314247;    // Владимир Афанасьев

async function sendTg(chatId: number, text: string): Promise<void> {
  const token = process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch { /* не блокируем основной поток */ }
}

async function notifyPenalty(opts: {
  staffTgId: number | null;
  staffName: string | null;
  eventTitle: string | null;
  eventDate: string | null;
  eventStartTime: string | null;
  eventEndTime: string | null;
  reasonCode: string;
  amount: number;
  source: string;
  slot?: number;
}): Promise<void> {
  const timeRange = opts.eventStartTime && opts.eventEndTime
    ? `${opts.eventStartTime.slice(0, 5)}–${opts.eventEndTime.slice(0, 5)}`
    : opts.eventStartTime?.slice(0, 5) ?? '—';

  const expectedAction = opts.reasonCode === 'missing_photo'
    ? 'загружены фото/видеоматериалы'
    : 'заполнен чек-лист';

  const overdueMins = (opts.slot ?? 1) * 30;

  // Сообщение сотруднику — детальное объяснение
  const staffText =
    `⚠️ <b>Штраф начислен — ${opts.amount} ₽</b>\n\n` +
    `В ${timeRange} у вас было назначено событие/активность:\n` +
    `📋 <b>«${opts.eventTitle ?? '—'}»</b>\n\n` +
    `По итогам этого события должны быть ${expectedAction}.\n\n` +
    `В течение ${overdueMins} мин после завершения вы не отчитались.\n\n` +
    `Назначен штраф: <b>${opts.amount} ₽</b>\n` +
    `Будьте внимательны на будущее.`;

  // Краткая копия для Дарьи и Владимира
  const managerText =
    `⚠️ Штраф → <b>${opts.staffName ?? 'сотрудник'}</b>\n` +
    `📋 «${opts.eventTitle ?? '—'}» (${timeRange})\n` +
    `Не ${expectedAction} в течение ${overdueMins} мин\n` +
    `💰 ${opts.amount} ₽`;

  const tasks: Promise<void>[] = [];
  // Сотруднику (если это не сами Дарья/Владимир — им придёт отдельная копия)
  if (opts.staffTgId && opts.staffTgId !== OWNER_TG_ID && opts.staffTgId !== DARYA_TG_ID) {
    tasks.push(sendTg(opts.staffTgId, staffText));
  }
  // Копия Дарье
  tasks.push(sendTg(DARYA_TG_ID, managerText));
  // Копия Владимиру
  tasks.push(sendTg(OWNER_TG_ID, managerText));
  await Promise.all(tasks);
}

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
      'SELECT default_rub, title FROM portal_penalty_reason WHERE code=$1 AND active=TRUE',
      [inp.reason_code],
    );
    if (reason.rowCount === 0) throw new Error(`unknown reason: ${inp.reason_code}`);
    const amount = inp.amount_rub ?? reason.rows[0].default_rub;
    const reasonTitle: string = reason.rows[0].title;
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
      // Уведомление в Telegram — сотруднику + копии Дарье и Владимиру
      const staffRow = await c.query(
        'SELECT telegram_id, full_name FROM portal_staff WHERE id=$1 LIMIT 1',
        [inp.staff_id],
      );
      const eventRow = inp.event_id
        ? await c.query(
            'SELECT title, date::text, start_time::text, end_time::text FROM shift_event WHERE id=$1 LIMIT 1',
            [inp.event_id],
          )
        : null;
      // slot из dedup_key (формат reason:event=X:slot=N)
      const slotMatch = inp.dedup_key?.match(/:slot=(\d+)$/);
      const slot = slotMatch ? Number(slotMatch[1]) : undefined;
      notifyPenalty({
        staffTgId: staffRow.rows[0]?.telegram_id ?? null,
        staffName: staffRow.rows[0]?.full_name ?? null,
        eventTitle: eventRow?.rows[0]?.title ?? null,
        eventDate: eventRow?.rows[0]?.date ?? null,
        eventStartTime: eventRow?.rows[0]?.start_time ?? null,
        eventEndTime: eventRow?.rows[0]?.end_time ?? null,
        reasonCode: inp.reason_code,
        amount,
        source: inp.source ?? 'manual',
        slot,
      }).catch(() => {});   // fire-and-forget, не ломаем основной поток
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
 * Сканер «событие закончилось + 30 мин, нет фото/не закрыт чеклист».
 * Начисляет 500 ₽ за каждые 30 минут просрочки — отдельно за фото и за чеклист.
 * dedup_key = `<reason>:event=<id>:slot=<N>` — один штраф на слот, не дублируется.
 * Слот 1 = первые 30 мин просрочки, слот 2 = следующие 30 мин, и т.д.
 */
export async function scanOverdueEvents(graceMinutes = 30): Promise<ScanResult> {
  const out: ScanResult = { scanned: 0, created: 0, reasons: {} };
  await withClient(async (c) => {
    const r = await c.query(
      `WITH due_events AS (
         SELECT e.id, e.shift_id, e.responsible_staff_id, e.title, e.date,
           GREATEST(0,
             EXTRACT(EPOCH FROM (
               now() - (e.date::timestamp + e.end_time + ($1::int || ' minutes')::interval)
             )) / 60
           )::int AS overdue_minutes
           FROM shift_event e
          WHERE e.responsible_staff_id IS NOT NULL
            AND e.end_time IS NOT NULL
            AND (e.date::timestamp + e.end_time + ($1::int || ' minutes')::interval) < now()
            AND e.date >= (CURRENT_DATE - INTERVAL '14 days')
       )
       SELECT de.*,
              -- сколько 30-минутных слотов уже накопилось (минимум 1)
              GREATEST(1, FLOOR(de.overdue_minutes / 30))::int AS max_slot,
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
      const maxSlot = Number(row.max_slot);
      // Штрафуем независимо за фото и за чеклист — каждый по 500 ₽ за слот
      const reasons: string[] = [];
      if (row.has_pending_task)   reasons.push('missing_photo');
      if (row.has_open_checklist) reasons.push('checklist_overdue');
      for (const reason of reasons) {
        for (let slot = 1; slot <= maxSlot; slot++) {
          const dedup = `${reason}:event=${row.id}:slot=${slot}`;
          const created = await createPenalty({
            staff_id: row.responsible_staff_id,
            shift_id: row.shift_id,
            event_id: row.id,
            reason_code: reason,
            reason_text: `Просрочка ${slot * 30} мин`,
            amount_rub: 500,
            source: 'auto',
            status: 'proposed',
            dedup_key: dedup,
          });
          if (created != null) {
            out.created++;
            out.reasons[reason] = (out.reasons[reason] ?? 0) + 1;
          }
        }
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
