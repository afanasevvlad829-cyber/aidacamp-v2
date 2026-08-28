// Единая система медиа: фото/видео крепятся к любой сущности портала
// через (entity_type, entity_id) поверх archive_photo.
import { withDbClient } from './db';

export type EntityType = 'event' | 'student' | 'prize' | 'lesson' | 'room' | 'profile' | string;

export interface MediaItem {
  id: number;
  entity_type: EntityType | null;
  entity_id: number | null;
  file_url: string | null;
  file_type: string;          // 'photo' | 'video'
  mime: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  author_telegram_id: number;
  author_name: string | null;
  sort_order: number;
  uploaded_at: string;
}


const SELECT_BASE = `
  SELECT ap.id, ap.entity_type, ap.entity_id, ap.event_id,
         ap.file_url, ap.file_type, ap.mime, ap.size_bytes,
         ap.width, ap.height, ap.duration_ms,
         ap.author_telegram_id, ps.full_name AS author_name,
         ap.sort_order, ap.uploaded_at
    FROM archive_photo ap
    LEFT JOIN portal_staff ps ON ps.telegram_id = ap.author_telegram_id
`;

export async function listMedia(entityType: EntityType, entityId: number | string): Promise<MediaItem[]> {
  return (await withDbClient(async (c) => {
    const eid = Number(entityId);
    const r = await c.query(
      `${SELECT_BASE}
        WHERE (ap.entity_type=$1 AND ap.entity_id=$2)
           OR (ap.entity_type IS NULL AND $1='event' AND ap.event_id=$2)
        ORDER BY ap.sort_order, ap.uploaded_at`,
      [entityType, Number.isFinite(eid) ? eid : null],
    );
    return r.rows as MediaItem[];
  })) ?? [];
}

export async function getMedia(id: number): Promise<MediaItem | null> {
  return (await withDbClient(async (c) => {
    const r = await c.query(`${SELECT_BASE} WHERE ap.id=$1`, [id]);
    return (r.rows[0] as MediaItem) ?? null;
  })) ?? null;
}

export async function attachMedia(inp: {
  entity_type: EntityType;
  entity_id: number;
  file_url: string;
  file_path?: string;          // относительный путь в хранилище
  file_type: 'photo' | 'video';
  mime?: string | null;
  size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  duration_ms?: number | null;
  author_telegram_id: number;
  storage_kind?: 'local' | 'yadisk';
}): Promise<number | null> {
  return await withDbClient(async (c) => {
    // Найти максимальный sort_order по этой сущности
    const s = await c.query(
      `SELECT COALESCE(MAX(sort_order), -1) AS s FROM archive_photo
        WHERE entity_type=$1 AND entity_id=$2`,
      [inp.entity_type, inp.entity_id],
    );
    const nextSort = (Number(s.rows[0]?.s ?? -1) + 1);
    const r = await c.query(
      `INSERT INTO archive_photo
        (entity_type, entity_id, event_id, storage_kind, file_path, file_url,
         file_type, mime, size_bytes, width, height, duration_ms,
         author_telegram_id, sort_order)
       VALUES ($1::text, $2::bigint,
               CASE WHEN $1::text='event' THEN $2::bigint ELSE NULL END,
               $3, $4, $5, $6, $7, $8::bigint, $9, $10, $11, $12::bigint, $13)
       RETURNING id`,
      [inp.entity_type, inp.entity_id,
       inp.storage_kind ?? 'local', inp.file_path ?? inp.file_url,
       inp.file_url, inp.file_type, inp.mime ?? null, inp.size_bytes ?? null,
       inp.width ?? null, inp.height ?? null, inp.duration_ms ?? null,
       inp.author_telegram_id, nextSort],
    );
    return r.rows[0].id as number;
  });
}

export async function deleteMedia(id: number): Promise<void> {
  await withDbClient(async (c) => {
    await c.query('DELETE FROM archive_photo WHERE id=$1', [id]);
  });
}

/** Массовое обновление sort_order. ids приходят в нужном порядке. */
export async function reorderMedia(ids: number[]): Promise<void> {
  if (!ids.length) return;
  await withDbClient(async (c) => {
    await c.query('BEGIN');
    try {
      for (let i = 0; i < ids.length; i++) {
        await c.query('UPDATE archive_photo SET sort_order=$1 WHERE id=$2', [i, ids[i]]);
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  });
}
