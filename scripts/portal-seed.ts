#!/usr/bin/env tsx
/**
 * Идемпотентный сидер смены АйДаКэмп по JSON-манифесту (новая концепция, 2026-05-26).
 *
 * Использование:
 *   AIDAPLUS_PG_DSN=... npx tsx scripts/portal-seed.ts [shift_manifest.json] [--wipe]
 *
 *  --wipe — снести существующие shift/shift_day/shift_event/event_checklist для этой смены
 *           (галочки checklist_done каскадно по shift_event), затем залить заново.
 *
 * По умолчанию манифест: scripts/portal-seed/shift_2026_05_30.json
 *
 * Что делает:
 *   1. Загружает canonical/checklists*.json → таблица checklist
 *   2. Загружает canonical/content_tasks*.json → таблица content_task_template
 *   3. Загружает manifest → shift, group_color, shift_day, portal_staff(staff_key)
 *   4. Загружает events_<shift>/day_*.json + регулярный шаблон → shift_event с external_id
 *      Идемпотентно: UPSERT по external_id.
 *   5. Привязывает чек-листы (event_checklist) по списку events[].checklists
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_DIR = join(__dirname, 'portal-seed');

// --------- args ---------
const args = process.argv.slice(2);
const wipe = args.includes('--wipe');
const manifestArg = args.find((a) => !a.startsWith('--'));
const manifestPath = manifestArg ? (manifestArg.startsWith('/') ? manifestArg : join(process.cwd(), manifestArg)) : join(SEED_DIR, 'shift_2026_05_30.json');

// --------- types ---------
type StaffSeed = { id: string; role: 'director'|'counselor'|'teacher'|'senior'; name: string; telegram_id: number | null };
type DaySeed = { day_number: number; date: string; type: string; title: string; pool_day?: boolean };
type EventSeed = {
  id: string;
  day_number: number;
  start_time?: string; end_time?: string;
  event_type: string;
  title: string;
  responsible?: string[];
  responsibility_notes?: Record<string, string>;
  checklists?: string[];
  checklists_if_pool?: string[];
  content_task_template?: string;
  content_task_template_if_pool?: string;
  notes?: string;
  activity_slug?: string;
  group_color?: string; // 'red'|'blue'|'green'|'yellow' (для уроков)
};
type Manifest = {
  shift: { id: string; name: string; start_date: string; end_date: string; location?: any };
  staff: StaffSeed[];
  days: DaySeed[];
  group_colors?: { key: string; name: string; hex?: string; teacher_staff_key?: string; sort?: number }[];
};

// --------- staff_key → role mapping (русская транслитерация) ---------
function mapRole(staffKey: string): string | null {
  if (staffKey.startsWith('counselor_')) return 'vozhaty';
  if (staffKey === 'counselor_duty') return 'vozhaty';
  if (staffKey.startsWith('teacher_')) return 'teacher';
  if (staffKey === 'director') return 'rukovoditel';
  if (staffKey === 'senior') return null; // роль не используем
  return null;
}
function mapStaffRole(seedRole: string): string {
  switch (seedRole) {
    case 'director': return 'rukovoditel';
    case 'counselor': return 'vozhaty';
    case 'teacher': return 'teacher';
    default: return seedRole; // senior и др. — оставим как есть, гейт их игнорит
  }
}
/** counselor_duty → counselor_1 (нечётный день) или counselor_2 (чётный) */
function resolveDuty(key: string, dayNumber: number): string {
  if (key !== 'counselor_duty') return key;
  return dayNumber % 2 === 1 ? 'counselor_1' : 'counselor_2';
}

// --------- file loaders ---------
function loadJson<T>(path: string): T { return JSON.parse(readFileSync(path, 'utf-8')) as T; }
function loadAll(dir: string, pattern: RegExp): any[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => pattern.test(f)).sort().map((f) => loadJson(join(dir, f)));
}

// --------- main ---------
async function main() {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!dsn) { console.error('AIDAPLUS_PG_DSN не задан'); process.exit(1); }

  console.log(`[seed] manifest: ${manifestPath}`);
  const manifest = loadJson<Manifest>(manifestPath);
  console.log(`[seed] shift: ${manifest.shift.name} (${manifest.shift.start_date} … ${manifest.shift.end_date})`);

  // canonical pools
  const checklistFiles = loadAll(join(SEED_DIR, 'canonical'), /^checklists.*\.json$/);
  const taskFiles = loadAll(join(SEED_DIR, 'canonical'), /^content_tasks.*\.json$/);
  const checklistsCanonical = checklistFiles.flatMap((j) => j.checklists ?? []);
  const tasksCanonical = taskFiles.flatMap((j) => j.content_task_templates ?? []);
  console.log(`[seed] canonical: ${checklistsCanonical.length} чек-листов, ${tasksCanonical.length} контент-заданий`);

  // events
  const eventsDir = join(SEED_DIR, `events_${manifest.shift.id.replace(/^shift-/, '').replace(/-/g, '_')}`);
  console.log(`[seed] events dir: ${eventsDir}`);
  const dayFiles = loadAll(eventsDir, /^day_-?\d+.*\.json$/);
  const tmplFiles = loadAll(eventsDir, /^regular_day_template.*\.json$/);
  const tmplEvents = tmplFiles.flatMap((j) => j.events_template ?? []);
  console.log(`[seed] events: ${dayFiles.length} файлов дней, ${tmplEvents.length} шаблонных слотов`);

  const client = new pg.Client({ connectionString: dsn });
  await client.connect();

  try {
    await client.query('BEGIN');

    // ---- 1. checklists (upsert by key) ----
    for (const cl of checklistsCanonical) {
      await client.query(
        `INSERT INTO checklist(key,title,items,applies_to)
         VALUES($1,$2,$3,$4)
         ON CONFLICT (key) DO UPDATE SET title=EXCLUDED.title, items=EXCLUDED.items, applies_to=EXCLUDED.applies_to`,
        [cl.id, cl.title, JSON.stringify((cl.items as string[]).map((t, i) => ({ id: `i${i + 1}`, text: t }))), cl.applies_to ?? null]
      );
    }
    console.log(`[seed] ✓ checklists: ${checklistsCanonical.length}`);

    // ---- 2. content_task_template ----
    for (const t of tasksCanonical) {
      await client.query(
        `INSERT INTO content_task_template(id,event_type,content_type,title,brief)
         VALUES($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET event_type=EXCLUDED.event_type, content_type=EXCLUDED.content_type,
           title=EXCLUDED.title, brief=EXCLUDED.brief`,
        [t.id, t.event_type, t.content_type, t.title, t.brief]
      );
    }
    console.log(`[seed] ✓ content_task_template: ${tasksCanonical.length}`);

    // ---- 3. shift (upsert by name, без ON CONFLICT — name не UNIQUE) ----
    const exist = await client.query("SELECT id FROM shift WHERE name=$1 LIMIT 1", [manifest.shift.name]);
    let shiftId: number;
    if (exist.rows[0]) {
      shiftId = exist.rows[0].id;
      await client.query("UPDATE shift SET start_date=$2, end_date=$3, status='active' WHERE id=$1",
        [shiftId, manifest.shift.start_date, manifest.shift.end_date]);
    } else {
      const ins = await client.query(
        "INSERT INTO shift(name,start_date,end_date,status) VALUES($1,$2,$3,'active') RETURNING id",
        [manifest.shift.name, manifest.shift.start_date, manifest.shift.end_date]);
      shiftId = ins.rows[0].id;
    }
    console.log(`[seed] ✓ shift id=${shiftId}`);

    if (wipe) {
      const del = await client.query("DELETE FROM shift_event WHERE shift_id=$1", [shiftId]);
      console.log(`[seed] --wipe: удалено shift_event=${del.rowCount}`);
    }

    // ---- 4. group_color (4 цвета) ----
    const defaultColors = [
      { key: 'red',    name: 'Красная', hex: '#ef4444', sort: 1 },
      { key: 'blue',   name: 'Синяя',   hex: '#3b82f6', sort: 2 },
      { key: 'green',  name: 'Зелёная', hex: '#10b981', sort: 3 },
      { key: 'yellow', name: 'Жёлтая',  hex: '#eab308', sort: 4 },
    ];
    const colors = manifest.group_colors ?? defaultColors;
    const colorIdByKey = new Map<string, number>();
    for (const c of colors) {
      const r = await client.query(
        `INSERT INTO group_color(shift_id,key,name,hex,teacher_staff_key,sort)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (shift_id,key) DO UPDATE SET name=EXCLUDED.name, hex=EXCLUDED.hex,
           teacher_staff_key=EXCLUDED.teacher_staff_key, sort=EXCLUDED.sort
         RETURNING id`,
        [shiftId, c.key, c.name, (c as any).hex ?? null, (c as any).teacher_staff_key ?? null, (c as any).sort ?? 0]
      );
      colorIdByKey.set(c.key, r.rows[0].id);
    }
    console.log(`[seed] ✓ group_color: ${colors.length}`);

    // ---- 5. shift_day ----
    const dayByNumber = new Map<number, { id: number; date: string; pool_day: boolean }>();
    for (const d of manifest.days) {
      const r = await client.query(
        `INSERT INTO shift_day(shift_id,date,title,type,day_number,pool_day)
         VALUES($1,$2,$3,$4,$5,$6)
         ON CONFLICT (shift_id,date) DO UPDATE SET title=EXCLUDED.title, type=EXCLUDED.type,
           day_number=EXCLUDED.day_number, pool_day=EXCLUDED.pool_day
         RETURNING id`,
        [shiftId, d.date, d.title, d.type, d.day_number, d.pool_day ?? false]
      );
      dayByNumber.set(d.day_number, { id: r.rows[0].id, date: d.date, pool_day: d.pool_day ?? false });
    }
    console.log(`[seed] ✓ shift_day: ${manifest.days.length}`);

    // ---- 6. portal_staff (staff_key) — только если ещё нет такой записи ----
    for (const s of manifest.staff) {
      if (s.telegram_id != null) {
        // привязка telegram_id ↔ staff_key
        await client.query(
          `INSERT INTO portal_staff(telegram_id, role, active, staff_key, full_name)
           VALUES($1,$2,TRUE,$3,$4)
           ON CONFLICT (telegram_id) DO UPDATE SET staff_key=EXCLUDED.staff_key,
             full_name=COALESCE(NULLIF(EXCLUDED.full_name,'TBD'), portal_staff.full_name)`,
          [s.telegram_id, mapStaffRole(s.role), s.id, s.name]
        ).catch((e) => { console.warn(`[seed] portal_staff skip ${s.id}: ${e.message}`); });
      } else {
        // TBD-плейсхолдер: создаём pending-запись только если staff_key ещё свободен
        const exists = await client.query("SELECT 1 FROM portal_staff WHERE staff_key=$1", [s.id]);
        if (exists.rowCount === 0) {
          // нет telegram_id — пропустим, заполнится при первом входе через TG
          console.log(`[seed]   staff_key=${s.id} (${s.role}) — TBD, ждём вход через TG`);
        }
      }
    }

    // ---- 7. собрать все события: фиксированные дни + клонирование шаблона ----
    type EvWithDay = EventSeed & { resolved_responsible: string[]; resolved_roles: string[] };
    const allEvents: EvWithDay[] = [];

    // 7a. явные дни из day_*.json
    for (const file of dayFiles) {
      for (const ev of file.events ?? []) {
        const day = dayByNumber.get(ev.day_number);
        if (!day) { console.warn(`[seed] event ${ev.id}: нет дня ${ev.day_number}`); continue; }
        const responsibleResolved = (ev.responsible ?? []).map((k: string) => resolveDuty(k, ev.day_number));
        const roles = Array.from(new Set(responsibleResolved.map(mapRole).filter(Boolean) as string[]));
        allEvents.push({ ...ev, resolved_responsible: responsibleResolved, resolved_roles: roles });
      }
    }

    // 7b. клонирование regular template на дни type=regular (включая 9 буферный)
    const regularDays = manifest.days.filter((d) => d.type === 'regular');
    for (const day of regularDays) {
      for (const t of tmplEvents) {
        const isPool = day.pool_day ?? false;
        const responsibleResolved = (t.responsible ?? []).map((k: string) => resolveDuty(k, day.day_number));
        const roles = Array.from(new Set(responsibleResolved.map(mapRole).filter(Boolean) as string[]));
        const checklists = t.event_type === 'pool_or_alt'
          ? (isPool ? (t.checklists_if_pool ?? []) : [])
          : (t.checklists ?? []);
        const contentTask = t.event_type === 'pool_or_alt'
          ? (isPool ? (t.content_task_template_if_pool ?? null) : null)
          : (t.content_task_template ?? null);
        allEvents.push({
          id: `ev-d${day.day_number}-${t.id_suffix}`,
          day_number: day.day_number,
          start_time: t.start_time, end_time: t.end_time,
          event_type: t.event_type,
          title: t.title,
          responsible: t.responsible,
          checklists,
          content_task_template: contentTask ?? undefined,
          resolved_responsible: responsibleResolved,
          resolved_roles: roles,
        });
      }
    }

    console.log(`[seed] всего событий к загрузке: ${allEvents.length}`);

    // ---- 8. UPSERT shift_event по external_id ----
    let inserted = 0, updated = 0;
    for (const ev of allEvents) {
      const day = dayByNumber.get(ev.day_number);
      if (!day) continue;
      const existing = await client.query("SELECT id FROM shift_event WHERE external_id=$1", [ev.id]);
      if (existing.rowCount && existing.rowCount > 0) {
        await client.query(
          `UPDATE shift_event SET
             shift_id=$1, date=$2, start_time=$3, end_time=$4, title=$5,
             event_type=$6::event_type_enum, activity_type=$7, roles=$8, staff_keys=$9,
             content_task_template_id=$10, activity_slug=$11, group_color_id=$12, notes=$13, sort=$14
           WHERE external_id=$15`,
          [shiftId, day.date, ev.start_time ?? null, ev.end_time ?? null, ev.title,
           ev.event_type, ev.event_type, ev.resolved_roles, ev.resolved_responsible,
           ev.content_task_template ?? null, ev.activity_slug ?? null,
           ev.group_color ? colorIdByKey.get(ev.group_color) ?? null : null,
           ev.notes ?? null, parseSort(ev.start_time), ev.id]
        );
        updated++;
      } else {
        await client.query(
          `INSERT INTO shift_event(shift_id, date, start_time, end_time, title, event_type, activity_type,
             roles, staff_keys, content_task_template_id, activity_slug, group_color_id, notes, sort, external_id)
           VALUES($1,$2,$3,$4,$5,$6::event_type_enum,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [shiftId, day.date, ev.start_time ?? null, ev.end_time ?? null, ev.title,
           ev.event_type, ev.event_type, ev.resolved_roles, ev.resolved_responsible,
           ev.content_task_template ?? null, ev.activity_slug ?? null,
           ev.group_color ? colorIdByKey.get(ev.group_color) ?? null : null,
           ev.notes ?? null, parseSort(ev.start_time), ev.id]
        );
        inserted++;
      }
    }
    console.log(`[seed] ✓ shift_event: ${inserted} новых, ${updated} обновлено`);

    // ---- 9. event_checklist (привязки) ----
    // Снесём текущие привязки этой смены и пересоздадим.
    await client.query(
      `DELETE FROM event_checklist
       WHERE event_id IN (SELECT id FROM shift_event WHERE shift_id=$1)`, [shiftId]);
    let attached = 0;
    for (const ev of allEvents) {
      if (!ev.checklists || ev.checklists.length === 0) continue;
      const evRow = await client.query("SELECT id FROM shift_event WHERE external_id=$1", [ev.id]);
      if (!evRow.rows[0]) continue;
      for (const clKey of ev.checklists) {
        const clRow = await client.query("SELECT id FROM checklist WHERE key=$1", [clKey]);
        if (!clRow.rows[0]) { console.warn(`[seed]   нет checklist key=${clKey}`); continue; }
        await client.query(
          `INSERT INTO event_checklist(event_id, checklist_id, roles) VALUES($1,$2,$3)`,
          [evRow.rows[0].id, clRow.rows[0].id, ev.resolved_roles]
        );
        attached++;
      }
    }
    console.log(`[seed] ✓ event_checklist: ${attached} привязок`);

    await client.query('COMMIT');
    console.log(`[seed] DONE.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

function parseSort(time?: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
