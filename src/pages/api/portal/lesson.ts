export const prerender = false;
import type { APIRoute } from 'astro';
import {
  listLessons, getLesson, upsertLesson, deleteLesson,
  listProgress, upsertProgress,
  type LessonStatus, type LessonProgress,
} from '../../../lib/portalLesson';

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), { status, headers: { 'Content-Type': 'application/json' } });
}
function ok(data: object = {}) {
  return new Response(JSON.stringify({ ok: true, ...data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function canEditLesson(role: string | null | undefined, lessonTeacherId: number | null, myStaffId: number | null): boolean {
  if (role === 'admin' || role === 'rukovoditel') return true;
  if (role === 'teacher' && myStaffId && lessonTeacherId === myStaffId) return true;
  return false;
}

async function staffIdByTg(tg: number | null | undefined): Promise<number | null> {
  if (tg == null) return null;
  const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!conn) return null;
  const { default: pg } = await import('pg');
  const c = new pg.Client({ connectionString: conn });
  await c.connect();
  try {
    const r = await c.query('SELECT id FROM portal_staff WHERE telegram_id=$1', [tg]);
    return r.rows[0] ? Number(r.rows[0].id) : null;
  } finally { await c.end(); }
}

export const GET: APIRoute = async ({ url, locals }) => {
  if (!locals.portalRole) return bad('unauthorized', 401);

  const subAction = url.searchParams.get('action');
  if (subAction === 'progress') {
    const lessonId = Number(url.searchParams.get('lesson_id') ?? '0');
    if (!lessonId) return bad('lesson_id required');
    return ok({ rows: await listProgress(lessonId) });
  }

  const filter: Parameters<typeof listLessons>[0] = {};
  const shiftId = Number(url.searchParams.get('shift_id') ?? 0);
  if (shiftId) filter.shift_id = shiftId;
  const teacher = Number(url.searchParams.get('teacher_staff_id') ?? 0);
  if (teacher) filter.teacher_staff_id = teacher;
  const date = url.searchParams.get('date');
  if (date) filter.date = date;
  const status = url.searchParams.get('status');
  if (status) filter.status = status as LessonStatus;
  return ok({ lessons: await listLessons(filter) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const role = locals.portalRole;
  const sub  = locals.portalSub;
  if (!role) return bad('unauthorized', 401);

  let body: any;
  try { body = await request.json(); } catch { return bad('invalid json'); }
  const action = String(body.action || 'upsert');
  const myStaffId = await staffIdByTg(sub);

  if (action === 'upsert') {
    const isUpdate = !!body.id;
    if (isUpdate) {
      const cur = await getLesson(Number(body.id));
      if (!cur) return bad('lesson not found', 404);
      if (!canEditLesson(role, cur.teacher_staff_id, myStaffId)) return bad('no permission', 403);
    } else {
      // Создавать урок может admin/rukovoditel ИЛИ преподаватель для себя
      if (role !== 'admin' && role !== 'rukovoditel') {
        if (role !== 'teacher') return bad('no permission', 403);
        // Преподаватель создаёт только себе
        if (!myStaffId || Number(body.teacher_staff_id) !== myStaffId) {
          return bad('teacher может создавать урок только себе', 403);
        }
      }
    }
    const id = await upsertLesson({
      id: body.id ? Number(body.id) : undefined,
      shift_id: Number(body.shift_id),
      date: String(body.date),
      start_time: body.start_time ?? null,
      end_time: body.end_time ?? null,
      teacher_staff_id: Number(body.teacher_staff_id),
      group_color_id: body.group_color_id ? Number(body.group_color_id) : null,
      activity_slug: body.activity_slug ?? null,
      topic: String(body.topic || '').trim(),
      expected_outcome: body.expected_outcome ?? null,
      materials_needed: body.materials_needed ?? null,
      status: (body.status as LessonStatus) ?? 'planned',
      shift_event_id: body.shift_event_id ? Number(body.shift_event_id) : null,
      notes: body.notes ?? null,
      created_by: myStaffId,
    });
    return ok({ id });
  }

  if (action === 'delete') {
    const id = Number(body.id);
    if (!id) return bad('id required');
    const cur = await getLesson(id);
    if (!cur) return ok({ id });
    if (!canEditLesson(role, cur.teacher_staff_id, myStaffId)) return bad('no permission', 403);
    await deleteLesson(id);
    return ok({ id });
  }

  if (action === 'progress') {
    const lessonId = Number(body.lesson_id);
    const kidId = Number(body.kid_id);
    if (!lessonId || !kidId) return bad('lesson_id + kid_id required');
    const cur = await getLesson(lessonId);
    if (!cur) return bad('lesson not found', 404);
    if (!canEditLesson(role, cur.teacher_staff_id, myStaffId)) return bad('no permission', 403);
    await upsertProgress({
      lesson_id: lessonId,
      kid_id: kidId,
      status: (body.status as LessonProgress) ?? 'not_started',
      outcome_note: body.outcome_note ?? null,
      difficulty_note: body.difficulty_note ?? null,
      artifact_url: body.artifact_url ?? null,
      recorded_by: myStaffId,
    });
    return ok({ lesson_id: lessonId, kid_id: kidId });
  }

  return bad('unknown action');
};
