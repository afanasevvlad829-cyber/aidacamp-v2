export const prerender = false;
import type { APIRoute } from 'astro';
import { requireAuth, requireStaff } from '../../../lib/portalPerms';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { insertPhoto, listPhotosByEvent, setContentTaskCompleted, lookupAuthorNames, resolveEventLocation } from '../../../lib/portalPhoto';
import { saveUploadedPhoto, saveUploadedVideo } from '../../../lib/portalPhotoStorage';

// Все авторизованные роли (включая student) могут загружать фото/видео в смене.
const ALLOWED_ROLES = new Set(['admin', 'teacher', 'vozhaty', 'rukovoditel', 'student']);
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 МБ
// Запас сверх файла — multipart boundary + остальные поля формы (event_id, caption и т.п.).
const MAX_CONTENT_LENGTH = MAX_FILE_BYTES + 1024 * 1024;
const UPLOADS_ROOT = '/var/www/aidacamp-dev/uploads/portal';
const URL_PREFIX = '/portal/uploads';

function jsonError(msg: string, status: number): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mimeToType(mime: string): 'photo' | 'video' | null {
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

function extFromMime(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'jpg', 'image/webp': 'jpg',
    'image/gif': 'gif', 'image/heic': 'jpg', 'image/heif': 'jpg',
    'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
    'video/x-msvideo': 'avi', 'video/3gpp': '3gp',
  };
  return map[mime] ?? fallback.replace(/^\./, '') ?? 'bin';
}

export const POST: APIRoute = async ({ locals, request }) => {
  // Auth — любая авторизованная роль (включая student)
  const authResult = requireAuth(locals);
  if (authResult instanceof Response) return jsonError('no-session', 401);
  const { role, sub } = authResult;
  if (!ALLOWED_ROLES.has(role)) return jsonError('forbidden', 403);

  // Отказ по Content-Length до чтения тела — не даём Node буферизовать заведомо
  // слишком большой аплоад целиком в память ради последующего reject.
  const contentLength = Number(request.headers.get('content-length') || '0');
  if (contentLength > MAX_CONTENT_LENGTH) return jsonError('file too large (max 500MB)', 413);

  // Parse form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError('invalid-form', 400);
  }

  const eventIdRaw = formData.get('event_id');
  const eventId = eventIdRaw ? Number(eventIdRaw) : NaN;
  if (!eventId || isNaN(eventId)) return jsonError('event_id required', 400);

  const contentTaskTemplateId = formData.get('content_task_id')?.toString().trim() || null;
  const caption = formData.get('caption')?.toString().trim() || null;

  const fileEntry = formData.get('file');
  if (!fileEntry || typeof fileEntry === 'string') return jsonError('file required', 400);
  const file = fileEntry as File;

  const mime = file.type || 'application/octet-stream';
  const fileType = mimeToType(mime);
  if (!fileType) return jsonError('unsupported mime type', 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) return jsonError('file too large (max 500MB)', 413);

  const location = await resolveEventLocation(eventId);
  if (!location) return jsonError('event not found', 404);
  const { date: eventDate, shift_id: shiftId, ext_id: eventExternalId } = location;

  const uuid = randomUUID();
  const relDir = `${shiftId}/${eventDate}/${eventExternalId || eventId}`;
  const absDir = `${UPLOADS_ROOT}/${relDir}`;

  const saved = fileType === 'photo'
    ? await saveUploadedPhoto({ buffer, uuid, relDir, absDir, urlPrefix: URL_PREFIX })
    : await saveUploadedVideo({
        buffer, uuid, relDir, absDir, urlPrefix: URL_PREFIX,
        ext: extname(file.name).replace(/^\./, '') || extFromMime(mime, 'bin'),
      });

  // Insert into DB
  let photoId: number;
  let storedFileUrl: string | null;
  try {
    const inserted = await insertPhoto({
      event_id: eventId,
      content_task_id: null, // resolved below if template found
      author_telegram_id: sub,
      file_type: fileType,
      mime,
      width: saved.width,
      height: saved.height,
      duration_ms: saved.duration_ms,
      size_bytes: saved.size_bytes,
      caption,
      storage_kind: 'local',
      file_path: saved.relPath,
      file_url: saved.fileUrl,
    });
    photoId = inserted.id;
    storedFileUrl = inserted.file_url;
  } catch (e: any) {
    return jsonError(`db error: ${e?.message ?? 'unknown'}`, 500);
  }

  // Mark content task completed
  if (contentTaskTemplateId) {
    try {
      await setContentTaskCompleted(eventId, contentTaskTemplateId, sub);
    } catch {
      // non-fatal
    }
  }

  return new Response(
    JSON.stringify({ ok: true, id: photoId, file_url: storedFileUrl ?? saved.fileUrl, file_type: fileType, width: saved.width, height: saved.height }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const GET: APIRoute = async ({ locals, url }) => {
  const authResult = requireAuth(locals);
  if (authResult instanceof Response) return jsonError('no-session', 401);

  const eventIdRaw = url.searchParams.get('event_id');
  const eventId = eventIdRaw ? Number(eventIdRaw) : NaN;
  if (!eventId || isNaN(eventId)) return jsonError('event_id required', 400);

  const photos = await listPhotosByEvent(eventId);
  const names = await lookupAuthorNames(photos.map((p) => p.author_telegram_id));
  const enriched = photos.map((p) => ({ ...p, author_name: names.get(p.author_telegram_id) ?? String(p.author_telegram_id) }));
  return new Response(JSON.stringify({ ok: true, photos: enriched }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
