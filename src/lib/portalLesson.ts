// Уроки преподавателей: расписание, тема, методичка, прогресс детей.

export type LessonStatus = 'planned' | 'in_progress' | 'done' | 'skipped' | 'cancelled';
export type LessonProgress = 'not_started' | 'attended' | 'completed' | 'absent' | 'excused';

export interface Lesson {
  id: number;
  shift_id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  teacher_staff_id: number;
  teacher_name: string | null;
  group_color_id: number | null;
  group_color_name: string | null;
  activity_slug: string | null;
  topic: string;
  expected_outcome: string | null;
  materials_needed: string | null;
  status: LessonStatus;
  shift_event_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LessonProgressRow {
  id: number;
  lesson_id: number;
  kid_id: number;
  kid_name: string | null;
  status: LessonProgress;
  outcome_note: string | null;
  difficulty_note: string | null;
  artifact_url: string | null;
  recorded_at: string;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

const SELECT_LESSON = `
  SELECT l.id, l.shift_id, to_char(l.date,'YYYY-MM-DD') AS date,
         l.start_time::text AS start_time, l.end_time::text AS end_time,
         l.teacher_staff_id, ps.full_name AS teacher_name,
         l.group_color_id, gc.name AS group_color_name,
         l.activity_slug, l.topic, l.expected_outcome, l.materials_needed,
         l.status::text AS status, l.shift_event_id, l.notes,
         l.created_at, l.updated_at
    FROM portal_lesson l
    LEFT JOIN portal_staff ps ON ps.id = l.teacher_staff_id
    LEFT JOIN group_color  gc ON gc.id = l.group_color_id
`;

export async function listLessons(filter: {
  shift_id?: number;
  teacher_staff_id?: number;
  date?: string;
  status?: LessonStatus | LessonStatus[];
} = {}): Promise<Lesson[]> {
  return (await withClient(async (c) => {
    const where: string[] = [];
    const vals: unknown[] = [];
    if (filter.shift_id)         { vals.push(filter.shift_id);         where.push(`l.shift_id=$${vals.length}`); }
    if (filter.teacher_staff_id) { vals.push(filter.teacher_staff_id); where.push(`l.teacher_staff_id=$${vals.length}`); }
    if (filter.date)             { vals.push(filter.date);             where.push(`l.date=$${vals.length}`); }
    if (filter.status) {
      const arr = Array.isArray(filter.status) ? filter.status : [filter.status];
      vals.push(arr);
      where.push(`l.status::text = ANY($${vals.length}::text[])`);
    }
    const sql = `${SELECT_LESSON}${where.length ? ' WHERE ' + where.join(' AND ') : ''}
                 ORDER BY l.date, l.start_time NULLS LAST, l.id`;
    const r = await c.query(sql, vals);
    return r.rows as Lesson[];
  })) ?? [];
}

export async function getLesson(id: number): Promise<Lesson | null> {
  return (await withClient(async (c) => {
    const r = await c.query(`${SELECT_LESSON} WHERE l.id=$1`, [id]);
    return (r.rows[0] as Lesson) ?? null;
  })) ?? null;
}

export interface UpsertInput {
  id?: number;
  shift_id: number;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  teacher_staff_id: number;
  group_color_id?: number | null;
  activity_slug?: string | null;
  topic: string;
  expected_outcome?: string | null;
  materials_needed?: string | null;
  status?: LessonStatus;
  shift_event_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
}

export async function upsertLesson(inp: UpsertInput): Promise<number | null> {
  return await withClient(async (c) => {
    if (inp.id) {
      await c.query(
        `UPDATE portal_lesson SET
           date=$2, start_time=$3, end_time=$4,
           teacher_staff_id=$5, group_color_id=$6, activity_slug=$7,
           topic=$8, expected_outcome=$9, materials_needed=$10,
           status=$11::lesson_status_enum, shift_event_id=$12, notes=$13
         WHERE id=$1`,
        [inp.id, inp.date, inp.start_time ?? null, inp.end_time ?? null,
         inp.teacher_staff_id, inp.group_color_id ?? null, inp.activity_slug ?? null,
         inp.topic, inp.expected_outcome ?? null, inp.materials_needed ?? null,
         inp.status ?? 'planned', inp.shift_event_id ?? null, inp.notes ?? null],
      );
      return inp.id;
    }
    const r = await c.query(
      `INSERT INTO portal_lesson
         (shift_id, date, start_time, end_time, teacher_staff_id, group_color_id,
          activity_slug, topic, expected_outcome, materials_needed,
          status, shift_event_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::lesson_status_enum,$12,$13,$14)
       RETURNING id`,
      [inp.shift_id, inp.date, inp.start_time ?? null, inp.end_time ?? null,
       inp.teacher_staff_id, inp.group_color_id ?? null, inp.activity_slug ?? null,
       inp.topic, inp.expected_outcome ?? null, inp.materials_needed ?? null,
       inp.status ?? 'planned', inp.shift_event_id ?? null, inp.notes ?? null,
       inp.created_by ?? null],
    );
    return r.rows[0].id as number;
  });
}

export async function deleteLesson(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query('DELETE FROM portal_lesson WHERE id=$1', [id]);
  });
}

// ── Progress per kid ─────────────────────────────────────────

export async function listProgress(lessonId: number): Promise<LessonProgressRow[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT lp.id, lp.lesson_id, lp.kid_id, k.full_name AS kid_name,
              lp.status::text AS status, lp.outcome_note, lp.difficulty_note,
              lp.artifact_url, lp.recorded_at
         FROM portal_lesson_progress lp
         JOIN portal_kid k ON k.id = lp.kid_id
        WHERE lp.lesson_id=$1
        ORDER BY k.full_name`,
      [lessonId],
    );
    return r.rows as LessonProgressRow[];
  })) ?? [];
}

export async function upsertProgress(inp: {
  lesson_id: number;
  kid_id: number;
  status?: LessonProgress;
  outcome_note?: string | null;
  difficulty_note?: string | null;
  artifact_url?: string | null;
  recorded_by?: number | null;
}): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_lesson_progress
         (lesson_id, kid_id, status, outcome_note, difficulty_note, artifact_url, recorded_by)
       VALUES ($1,$2,$3::lesson_progress_enum,$4,$5,$6,$7)
       ON CONFLICT (lesson_id, kid_id) DO UPDATE SET
         status        = EXCLUDED.status,
         outcome_note  = COALESCE(EXCLUDED.outcome_note, portal_lesson_progress.outcome_note),
         difficulty_note = COALESCE(EXCLUDED.difficulty_note, portal_lesson_progress.difficulty_note),
         artifact_url  = COALESCE(EXCLUDED.artifact_url, portal_lesson_progress.artifact_url),
         recorded_by   = EXCLUDED.recorded_by,
         recorded_at   = now()`,
      [inp.lesson_id, inp.kid_id, inp.status ?? 'not_started',
       inp.outcome_note ?? null, inp.difficulty_note ?? null,
       inp.artifact_url ?? null, inp.recorded_by ?? null],
    );
  });
}

/** Прогресс конкретного ребёнка по всем урокам смены — для «карточки ученика». */
export async function kidLearningPath(kidId: number, shiftId: number): Promise<Array<Lesson & { kid_status: LessonProgress | null; kid_outcome: string | null }>> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `${SELECT_LESSON.replace('SELECT', `SELECT lp.status::text AS kid_status, lp.outcome_note AS kid_outcome,`)}
         LEFT JOIN portal_lesson_progress lp ON lp.lesson_id=l.id AND lp.kid_id=$1
        WHERE l.shift_id=$2
        ORDER BY l.date, l.start_time NULLS LAST`,
      [kidId, shiftId],
    );
    return r.rows as any;
  })) ?? [];
}
