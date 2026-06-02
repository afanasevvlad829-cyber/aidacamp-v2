// Self-check для событий типа «Подъём»: каждый сотрудник отмечает себя сам.

export interface SelfCheckRow {
  staff_id: number;
  full_name: string | null;
  role: string | null;
  checked_at: string | null;   // null = ещё не отметился
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

/** Список активных staff и их отметки для конкретного события. */
export async function listForEvent(eventId: number): Promise<SelfCheckRow[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT s.id staff_id, s.full_name, s.role, esc.checked_at
         FROM portal_staff s
         LEFT JOIN event_self_check esc ON esc.event_id=$1 AND esc.staff_id=s.id
        WHERE s.active = TRUE
        ORDER BY (s.role='admin') DESC, (s.role='rukovoditel') DESC, s.full_name`,
      [eventId],
    );
    return r.rows.map((x: any) => ({
      staff_id: Number(x.staff_id),
      full_name: x.full_name,
      role: x.role,
      checked_at: x.checked_at ? new Date(x.checked_at).toISOString() : null,
    }));
  })) ?? [];
}

/** Отметить «я встал» — текущий пользователь (telegramId → portal_staff.id). */
export async function markChecked(eventId: number, telegramId: number): Promise<{ ok: true; checked_at: string } | { ok: false; error: string }> {
  const res = await withClient(async (c) => {
    const s = await c.query('SELECT id, active FROM portal_staff WHERE telegram_id=$1', [telegramId]);
    if (s.rowCount === 0) return { ok: false as const, error: 'staff not found' };
    if (!s.rows[0].active) return { ok: false as const, error: 'staff inactive' };
    const staffId = Number(s.rows[0].id);
    const e = await c.query('SELECT event_type::text FROM shift_event WHERE id=$1', [eventId]);
    if (e.rowCount === 0) return { ok: false as const, error: 'event not found' };
    if (e.rows[0].event_type !== 'wakeup') return { ok: false as const, error: 'self-check is for wakeup events only' };
    const r = await c.query(
      `INSERT INTO event_self_check(event_id, staff_id)
       VALUES ($1,$2)
       ON CONFLICT (event_id, staff_id) DO UPDATE SET checked_at = event_self_check.checked_at
       RETURNING checked_at`,
      [eventId, staffId],
    );
    return { ok: true as const, checked_at: new Date(r.rows[0].checked_at).toISOString() };
  });
  return res ?? { ok: false, error: 'no db' };
}

/** Снять отметку (на случай ошибки). Только сам с себя. */
export async function unmark(eventId: number, telegramId: number): Promise<{ ok: boolean }> {
  const res = await withClient(async (c) => {
    const s = await c.query('SELECT id FROM portal_staff WHERE telegram_id=$1', [telegramId]);
    if (s.rowCount === 0) return { ok: false };
    await c.query('DELETE FROM event_self_check WHERE event_id=$1 AND staff_id=$2', [eventId, Number(s.rows[0].id)]);
    return { ok: true };
  });
  return res ?? { ok: false };
}

/** Отметить по staff_id напрямую (для код-входа без telegram_id). */
export async function markCheckedByStaffId(eventId: number, staffId: number): Promise<{ ok: true; checked_at: string } | { ok: false; error: string }> {
  const res = await withClient(async (c) => {
    const s = await c.query('SELECT id, active FROM portal_staff WHERE id=$1', [staffId]);
    if (s.rowCount === 0 || !s.rows[0].active) return { ok: false as const, error: 'сотрудник не найден или неактивен' };
    const r = await c.query(
      `INSERT INTO event_self_check(event_id, staff_id)
       VALUES($1,$2)
       ON CONFLICT (event_id, staff_id) DO UPDATE SET checked_at = event_self_check.checked_at
       RETURNING to_char(checked_at AT TIME ZONE 'Europe/Moscow','HH24:MI') checked_at`,
      [eventId, staffId]);
    return { ok: true as const, checked_at: r.rows[0]?.checked_at ?? '' };
  });
  return res ?? { ok: false, error: 'db error' };
}

/** Снять отметку по staff_id напрямую (для код-входа без telegram_id). */
export async function unmarkByStaffId(eventId: number, staffId: number): Promise<{ ok: boolean }> {
  const res = await withClient(async (c) => {
    await c.query('DELETE FROM event_self_check WHERE event_id=$1 AND staff_id=$2', [eventId, staffId]);
    return { ok: true };
  });
  return res ?? { ok: false };
}
