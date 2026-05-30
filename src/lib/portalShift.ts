import type { PortalRole } from './portalSession';

export interface ContentTask {
  id: number;
  title: string;
  brief: string | null;
  content_type: string | null;
}

export interface ShiftEvent {
  id: number;
  external_id: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  /** @deprecated дублирует event_type для совместимости. Используй event_type. */
  activity_type: string | null;
  event_type: string | null;
  activity_slug: string | null;
  content_task_template_id: string | null;
  content_task: ContentTask | null;
  group_color_id: number | null;
  staff_keys: string[];
  roles: string[];
  notes: string | null;
  sort: number;
  responsible_staff_id: number | null;
  responsible_name: string | null;
  checklists: { event_checklist_id: number; checklist_id: number; title: string;
    roles: string[]; items: { id: string; text: string }[] }[];
}
export interface Shift { id: number; name: string; start_date: string; end_date: string; status: string; }

/** Русские лейблы для event_type — для UI «По активностям». */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  meal: 'Приёмы пищи',
  lesson: 'Уроки',
  pool: 'Бассейн',
  pool_or_alt: 'Бассейн / альтернатива',
  free_time: 'Свободное время',
  evening_event: 'Вечернее мероприятие',
  transit: 'Транспорт',
  housing: 'Расселение',
  ceremony: 'Церемонии',
  departure: 'Отъезд',
  medical: 'Медицина',
  report: 'Отчёт',
  routine: 'Распорядок',
  bedtime: 'Отбой',
  admin: 'Администрирование',
};

/** Tailwind-классы для цветной плашки event_type (bg + text + border). */
export const EVENT_TYPE_COLORS: Record<string, string> = {
  meal:          'bg-amber-50 text-amber-800 border-amber-200',
  lesson:        'bg-blue-50 text-blue-800 border-blue-200',
  pool:          'bg-cyan-50 text-cyan-800 border-cyan-200',
  pool_or_alt:   'bg-cyan-50 text-cyan-800 border-cyan-200',
  free_time:     'bg-emerald-50 text-emerald-800 border-emerald-200',
  evening_event: 'bg-purple-50 text-purple-800 border-purple-200',
  transit:       'bg-sky-50 text-sky-800 border-sky-200',
  housing:       'bg-indigo-50 text-indigo-800 border-indigo-200',
  ceremony:      'bg-pink-50 text-pink-800 border-pink-200',
  departure:     'bg-rose-50 text-rose-800 border-rose-200',
  medical:       'bg-red-50 text-red-800 border-red-200',
  report:        'bg-orange-50 text-orange-800 border-orange-200',
  routine:       'bg-slate-50 text-slate-700 border-slate-200',
  bedtime:       'bg-slate-100 text-slate-600 border-slate-300',
  admin:         'bg-zinc-50 text-zinc-700 border-zinc-200',
};
export function eventColorClass(eventType: string | null | undefined): string {
  return (eventType && EVENT_TYPE_COLORS[eventType]) || 'bg-slate-50 text-slate-700 border-slate-200';
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

export async function getActiveShift(): Promise<Shift | null> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT id,name,to_char(start_date,'YYYY-MM-DD') start_date,to_char(end_date,'YYYY-MM-DD') end_date,status FROM shift WHERE status='active' ORDER BY start_date DESC LIMIT 1");
    return (r.rows[0] as Shift) ?? null;
  })) ?? null;
}

/** Отсортированный список дат смены (для навигации/шахматки) — без загрузки событий. */
export async function getEventDates(shiftId: number): Promise<string[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      "SELECT DISTINCT to_char(date,'YYYY-MM-DD') date FROM shift_event WHERE shift_id=$1 ORDER BY date", [shiftId]);
    return r.rows.map((x: any) => x.date as string);
  })) ?? [];
}

/** События смены. Если передана дата — только за этот день (легче для role/day видов). */
export async function getEvents(shiftId: number, date?: string): Promise<ShiftEvent[]> {
  return (await withClient(async (c) => {
    const COLS = "e.id,e.external_id,to_char(e.date,'YYYY-MM-DD') date,e.start_time::text,e.end_time::text,e.title,e.activity_type,e.event_type::text,e.activity_slug,e.content_task_template_id,e.group_color_id,e.staff_keys,e.roles,e.notes,e.sort,e.responsible_staff_id,ps.full_name AS responsible_name,ct.id ct_id,ct.title ct_title,ct.brief ct_brief,ct.content_type ct_content_type";
    const JOINS = "LEFT JOIN content_task_template ct ON ct.id::text=e.content_task_template_id LEFT JOIN portal_staff ps ON ps.id=e.responsible_staff_id";
    const ev = date
      ? await c.query(
          `SELECT ${COLS} FROM shift_event e ${JOINS} WHERE e.shift_id=$1 AND e.date=$2 ORDER BY e.date,e.sort,e.start_time`, [shiftId, date])
      : await c.query(
          `SELECT ${COLS} FROM shift_event e ${JOINS} WHERE e.shift_id=$1 ORDER BY e.date,e.sort,e.start_time`, [shiftId]);
    const ecl = await c.query(
      "SELECT ec.id event_checklist_id, ec.event_id, ec.checklist_id, ec.roles, cl.title, cl.items FROM event_checklist ec JOIN checklist cl ON cl.id=ec.checklist_id WHERE ec.event_id = ANY($1)",
      [ev.rows.map((e: any) => e.id)]);
    const byEvent = new Map<number, any[]>();
    for (const row of ecl.rows) {
      const arr = byEvent.get(row.event_id) ?? []; arr.push(row); byEvent.set(row.event_id, arr);
    }
    return ev.rows.map((e: any) => ({
      ...e,
      content_task: e.ct_id != null ? { id: e.ct_id, title: e.ct_title, brief: e.ct_brief, content_type: e.ct_content_type } : null,
      checklists: (byEvent.get(e.id) ?? []).map((r: any) => ({
        event_checklist_id: r.event_checklist_id, checklist_id: r.checklist_id, title: r.title, roles: r.roles, items: r.items })),
    }));
  })) ?? [];
}

/** Множество ключей "eventId:checklistId:itemId", отмеченных этим человеком. */
export async function getDone(telegramId: number, shiftId: number): Promise<Set<string>> {
  return (await withClient(async (c) => {
    const r = await c.query(
      "SELECT d.event_id,d.checklist_id,d.item_id FROM checklist_done d JOIN shift_event e ON e.id=d.event_id WHERE e.shift_id=$1 AND d.telegram_id=$2",
      [shiftId, telegramId]);
    return new Set(r.rows.map((x: any) => `${x.event_id}:${x.checklist_id}:${x.item_id}`));
  })) ?? new Set<string>();
}

/** Переключить пункт; возвращает {done}. roles — роли event_checklist для проверки доступа. */
export async function toggleDone(telegramId: number, eventId: number, checklistId: number, itemId: string): Promise<{ done: boolean } | null> {
  return await withClient(async (c) => {
    const del = await c.query("DELETE FROM checklist_done WHERE event_id=$1 AND checklist_id=$2 AND item_id=$3 AND telegram_id=$4",
      [eventId, checklistId, itemId, telegramId]);
    if (del.rowCount && del.rowCount > 0) return { done: false };
    await c.query("INSERT INTO checklist_done(event_id,checklist_id,item_id,telegram_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [eventId, checklistId, itemId, telegramId]);
    return { done: true };
  });
}

/** Роли event_checklist (для проверки доступа в API). */
export async function eventChecklistRoles(eventId: number, checklistId: number): Promise<string[]> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT roles FROM event_checklist WHERE event_id=$1 AND checklist_id=$2 LIMIT 1", [eventId, checklistId]);
    return (r.rows[0]?.roles as string[]) ?? [];
  })) ?? [];
}

// ===== Admin helpers =====
export interface ChecklistTemplate { id: number; key: string | null; title: string; items: { id: string; text: string }[] }

/** Все смены (для админки). */
export async function listShifts(): Promise<Shift[]> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT id,name,to_char(start_date,'YYYY-MM-DD') start_date,to_char(end_date,'YYYY-MM-DD') end_date,status FROM shift ORDER BY start_date DESC");
    return r.rows as Shift[];
  })) ?? [];
}

/** Шаблоны чек-листов (для админки). */
export async function getChecklists(): Promise<ChecklistTemplate[]> {
  return (await withClient(async (c) => {
    const r = await c.query("SELECT id,key,title,items FROM checklist ORDER BY title");
    return r.rows as ChecklistTemplate[];
  })) ?? [];
}

/** Создать смену; возвращает id. */
export async function createShift(name: string, start: string, end: string): Promise<number | null> {
  return await withClient(async (c) => {
    const r = await c.query("INSERT INTO shift(name,start_date,end_date) VALUES($1,$2,$3) RETURNING id", [name, start, end]);
    return r.rows[0].id as number;
  });
}

/** Архивировать смену. */
export async function archiveShift(id: number): Promise<void> {
  await withClient(async (c) => { await c.query("UPDATE shift SET status='archived' WHERE id=$1", [id]); });
}

/** Создать/обновить событие; возвращает id. */
export async function upsertEvent(e: {
  id?: number; shiftId: number; date: string; start_time: string | null; end_time: string | null;
  title: string; activity_type: string | null; roles: string[]; sort: number; notes?: string | null;
  responsible_staff_id?: number | null;
}): Promise<number | null> {
  return await withClient(async (c) => {
    if (e.id) {
      await c.query(
        "UPDATE shift_event SET date=$2,start_time=$3,end_time=$4,title=$5,activity_type=$6,roles=$7,sort=$8,notes=$9,responsible_staff_id=$10 WHERE id=$1",
        [e.id, e.date, e.start_time, e.end_time, e.title, e.activity_type, e.roles, e.sort, e.notes ?? null, e.responsible_staff_id ?? null]);
      return e.id;
    }
    const r = await c.query(
      "INSERT INTO shift_event(shift_id,date,start_time,end_time,title,activity_type,roles,sort,notes,responsible_staff_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
      [e.shiftId, e.date, e.start_time, e.end_time, e.title, e.activity_type, e.roles, e.sort, e.notes ?? null, e.responsible_staff_id ?? null]);
    return r.rows[0].id as number;
  });
}

/** Создать/обновить шаблон чек-листа; возвращает id. */
export async function upsertChecklist(cl: {
  id?: number; key: string | null; title: string; items: { id: string; text: string }[];
}): Promise<number | null> {
  return await withClient(async (c) => {
    if (cl.id) {
      await c.query("UPDATE checklist SET key=$2,title=$3,items=$4 WHERE id=$1", [cl.id, cl.key, cl.title, JSON.stringify(cl.items)]);
      return cl.id;
    }
    const r = await c.query("INSERT INTO checklist(key,title,items) VALUES($1,$2,$3) RETURNING id", [cl.key, cl.title, JSON.stringify(cl.items)]);
    return r.rows[0].id as number;
  });
}

/** Удалить событие (каскадно — все привязки чек-листов и отметки). */
export async function deleteEvent(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query("DELETE FROM shift_event WHERE id=$1", [id]);
  });
}

/** Удалить шаблон чек-листа (и каскадно — все его привязки и отметки). */
export async function deleteChecklist(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query("DELETE FROM checklist WHERE id=$1", [id]);
  });
}

/** Привязать чек-лист к событию для ролей (или обновить роли существующей привязки). */
export async function attachChecklist(eventId: number, checklistId: number, roles: string[]): Promise<void> {
  await withClient(async (c) => {
    const ex = await c.query("SELECT id FROM event_checklist WHERE event_id=$1 AND checklist_id=$2 LIMIT 1", [eventId, checklistId]);
    if (ex.rows[0]) {
      await c.query("UPDATE event_checklist SET roles=$2 WHERE id=$1", [ex.rows[0].id, roles]);
    } else {
      await c.query("INSERT INTO event_checklist(event_id,checklist_id,roles) VALUES($1,$2,$3)", [eventId, checklistId, roles]);
    }
  });
}
