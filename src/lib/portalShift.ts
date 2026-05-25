import type { PortalRole } from './portalSession';

export interface ShiftEvent {
  id: number; date: string; start_time: string | null; end_time: string | null;
  title: string; activity_type: string | null; roles: string[]; sort: number;
  checklists: { event_checklist_id: number; checklist_id: number; title: string;
    roles: string[]; items: { id: string; text: string }[] }[];
}
export interface Shift { id: number; name: string; start_date: string; end_date: string; status: string; }

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

export async function getEvents(shiftId: number): Promise<ShiftEvent[]> {
  return (await withClient(async (c) => {
    const ev = await c.query(
      "SELECT id,to_char(date,'YYYY-MM-DD') date,start_time::text,end_time::text,title,activity_type,roles,sort FROM shift_event WHERE shift_id=$1 ORDER BY date,sort,start_time", [shiftId]);
    const ecl = await c.query(
      "SELECT ec.id event_checklist_id, ec.event_id, ec.checklist_id, ec.roles, cl.title, cl.items FROM event_checklist ec JOIN checklist cl ON cl.id=ec.checklist_id WHERE ec.event_id = ANY($1)",
      [ev.rows.map((e: any) => e.id)]);
    const byEvent = new Map<number, any[]>();
    for (const row of ecl.rows) {
      const arr = byEvent.get(row.event_id) ?? []; arr.push(row); byEvent.set(row.event_id, arr);
    }
    return ev.rows.map((e: any) => ({ ...e, checklists: (byEvent.get(e.id) ?? []).map((r: any) => ({
      event_checklist_id: r.event_checklist_id, checklist_id: r.checklist_id, title: r.title, roles: r.roles, items: r.items })) }));
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
