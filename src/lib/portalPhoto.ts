/**
 * portalPhoto.ts — слой данных для фото-архива портала.
 * Паттерн withClient идентичен portalShift.ts.
 */

export interface ArchivePhoto {
  id: number;
  event_id: number;
  content_task_id: number | null;
  author_telegram_id: number;
  storage_kind: string;
  file_path: string;
  file_url: string | null;
  file_type: string;
  mime: string | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  size_bytes: number | null;
  caption: string | null;
  uploaded_at: string;
}

export interface EventContentTask {
  event_id: number;
  template_id: string;
  status: 'pending' | 'completed' | 'skipped';
  brief: string | null;
  content_type: string | null;
  title: string | null;
}

export interface InsertPhotoParams {
  event_id: number;
  content_task_id?: number | null;
  author_telegram_id: number;
  file_type: string;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  size_bytes: number;
  caption?: string | null;
  storage_kind: string;
  file_path: string;
  file_url?: string | null;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }

async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn();
  if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

export async function listPhotosByEvent(eventId: number): Promise<ArchivePhoto[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, event_id, content_task_id, author_telegram_id, storage_kind,
              file_path, file_url, file_type, mime, width, height, duration_ms,
              size_bytes, caption, uploaded_at
       FROM archive_photo
       WHERE event_id = $1
       ORDER BY uploaded_at DESC`,
      [eventId],
    );
    return r.rows as ArchivePhoto[];
  })) ?? [];
}

export async function listPhotosByDay(shiftId: number, date: string): Promise<ArchivePhoto[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT ap.id, ap.event_id, ap.content_task_id, ap.author_telegram_id, ap.storage_kind,
              ap.file_path, ap.file_url, ap.file_type, ap.mime, ap.width, ap.height, ap.duration_ms,
              ap.size_bytes, ap.caption, ap.uploaded_at
       FROM archive_photo ap
       JOIN shift_event se ON se.id = ap.event_id
       WHERE se.shift_id = $1 AND se.date = $2
       ORDER BY ap.uploaded_at DESC`,
      [shiftId, date],
    );
    return r.rows as ArchivePhoto[];
  })) ?? [];
}

export async function insertPhoto(p: InsertPhotoParams): Promise<{ id: number; file_url: string | null }> {
  const result = await withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO archive_photo
         (event_id, content_task_id, author_telegram_id, storage_kind, file_path, file_url,
          file_type, mime, width, height, duration_ms, size_bytes, caption)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, file_url`,
      [
        p.event_id,
        p.content_task_id ?? null,
        p.author_telegram_id,
        p.storage_kind,
        p.file_path,
        p.file_url ?? null,
        p.file_type,
        p.mime ?? null,
        p.width ?? null,
        p.height ?? null,
        p.duration_ms ?? null,
        p.size_bytes,
        p.caption ?? null,
      ],
    );
    return { id: r.rows[0].id as number, file_url: r.rows[0].file_url as string | null };
  });
  if (!result) throw new Error('DB not available');
  return result;
}

/**
 * Переводит event_content_task в статус 'completed'.
 * Идемпотентно: ничего не делает, если статус уже completed.
 */
export async function setContentTaskCompleted(
  eventId: number,
  templateId: string,
  byTelegramId: number,
): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `UPDATE event_content_task
       SET status = 'completed', completed_at = now(), completed_by = $3
       WHERE event_id = $1 AND template_id = $2 AND status <> 'completed'`,
      [eventId, templateId, byTelegramId],
    );
  });
}

/** Получить фото по id. */
export async function getPhotoById(id: number): Promise<ArchivePhoto | null> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, event_id, content_task_id, author_telegram_id, storage_kind,
              file_path, file_url, file_type, mime, width, height, duration_ms,
              size_bytes, caption, to_char(uploaded_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"') uploaded_at
       FROM archive_photo WHERE id=$1`,
      [id],
    );
    return (r.rows[0] as ArchivePhoto) ?? null;
  })) ?? null;
}

/** Удалить запись фото из БД (файл — отдельно в endpoint). */
export async function deletePhotoRow(id: number): Promise<boolean> {
  const ok = await withClient(async (c) => {
    const r = await c.query('DELETE FROM archive_photo WHERE id=$1', [id]);
    return (r.rowCount ?? 0) > 0;
  });
  return ok ?? false;
}

/** Имена авторов по telegram_id — для ленты. */
export async function lookupAuthorNames(telegramIds: number[]): Promise<Map<number, string>> {
  if (telegramIds.length === 0) return new Map();
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT telegram_id, COALESCE(NULLIF(full_name,''), tg_username, telegram_id::text) AS name
       FROM portal_staff WHERE telegram_id = ANY($1)`,
      [telegramIds],
    );
    const m = new Map<number, string>();
    for (const row of r.rows) m.set(Number(row.telegram_id), String(row.name));
    return m;
  })) ?? new Map();
}

/**
 * Список задач контента для нескольких событий, с данными из content_task_template.
 */
export async function listEventContentTasks(
  eventIds: number[],
): Promise<EventContentTask[]> {
  if (eventIds.length === 0) return [];
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT ect.event_id, ect.template_id, ect.status::text,
              ctt.brief, ctt.content_type::text, ctt.title
       FROM event_content_task ect
       JOIN content_task_template ctt ON ctt.id = ect.template_id
       WHERE ect.event_id = ANY($1)
       ORDER BY ect.event_id, ect.template_id`,
      [eventIds],
    );
    return r.rows as EventContentTask[];
  })) ?? [];
}
