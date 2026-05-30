export const prerender = false;
import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { verifySessionPayload } from '../../../lib/portalSession';
import { insertPhoto, listPhotosByEvent, setContentTaskCompleted, lookupAuthorNames } from '../../../lib/portalPhoto';

const execFileAsync = promisify(execFile);

// Все авторизованные роли (включая student) могут загружать фото/видео в смене.
const ALLOWED_ROLES = new Set(['admin', 'teacher', 'vozhaty', 'rukovoditel', 'student']);
const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 МБ
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

async function probeVideoDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 5000 });
    const secs = parseFloat(stdout.trim());
    return isNaN(secs) ? null : Math.round(secs * 1000);
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  // Auth
  const session = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!session || !session.sub) return jsonError('no-session', 401);
  if (!ALLOWED_ROLES.has(session.role)) return jsonError('forbidden', 403);

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

  // Resolve event date and shift_id for path
  let eventDate = 'unknown';
  let shiftId = 0;
  let eventExternalId = '';
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '' });
    await client.connect();
    try {
      const r = await client.query(
        `SELECT to_char(date,'YYYY-MM-DD') date, shift_id, COALESCE(external_id, id::text) ext_id
         FROM shift_event WHERE id = $1`,
        [eventId],
      );
      if (r.rows[0]) {
        eventDate = r.rows[0].date as string;
        shiftId = r.rows[0].shift_id as number;
        eventExternalId = r.rows[0].ext_id as string;
      }
    } finally {
      await client.end();
    }
  } catch {
    // non-fatal — fall back to defaults
  }
  if (!shiftId) return jsonError('event not found', 404);

  // Save file
  const uuid = randomUUID();
  const origExt = extname(file.name).replace(/^\./, '') || extFromMime(mime, 'bin');
  const relDir = `${shiftId}/${eventDate}/${eventExternalId || eventId}`;
  const absDir = join(UPLOADS_ROOT, relDir);

  await mkdir(absDir, { recursive: true });

  let finalExt = origExt;
  let width: number | null = null;
  let height: number | null = null;
  let duration_ms: number | null = null;
  let finalBuffer = buffer;

  if (fileType === 'photo') {
    finalExt = 'jpg';
    try {
      const sharp = (await import('sharp')).default;
      const sharpInstance = sharp(buffer).rotate(); // auto-orient
      const meta = await sharpInstance.metadata();
      const maxSide = 1600;
      let resizer = sharpInstance;
      if ((meta.width ?? 0) > maxSide || (meta.height ?? 0) > maxSide) {
        resizer = sharpInstance.resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true });
      }
      const jpegBuf = await resizer.jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
      finalBuffer = jpegBuf.data;
      width = jpegBuf.info.width;
      height = jpegBuf.info.height;
    } catch {
      // sharp failed — save original, no dimensions
    }
  } else {
    // video: probe duration
    const tmpPath = join(absDir, `${uuid}_tmp.${origExt}`);
    await writeFile(tmpPath, buffer);
    duration_ms = await probeVideoDuration(tmpPath);
    // rename to final below
    try { const { rename } = await import('node:fs/promises'); await rename(tmpPath, join(absDir, `${uuid}.${origExt}`)); } catch { /* ignore */ }
    finalExt = origExt;
  }

  const fileName = `${uuid}.${finalExt}`;
  const absPath = join(absDir, fileName);

  if (fileType === 'photo') {
    await writeFile(absPath, finalBuffer);
  }
  // video was already written above during probe (or will be written now if probe skipped)
  if (fileType === 'video') {
    try { await writeFile(absPath, buffer); } catch { /* already written */ }
  }

  const relPath = `${relDir}/${fileName}`;
  const fileUrl = `${URL_PREFIX}/${relPath}`;

  // Insert into DB
  let photoId: number;
  let storedFileUrl: string | null;
  try {
    const inserted = await insertPhoto({
      event_id: eventId,
      content_task_id: null, // resolved below if template found
      author_telegram_id: session.sub,
      file_type: fileType,
      mime,
      width,
      height,
      duration_ms,
      size_bytes: finalBuffer.byteLength,
      caption,
      storage_kind: 'local',
      file_path: relPath,
      file_url: fileUrl,
    });
    photoId = inserted.id;
    storedFileUrl = inserted.file_url;
  } catch (e: any) {
    return jsonError(`db error: ${e?.message ?? 'unknown'}`, 500);
  }

  // Mark content task completed
  if (contentTaskTemplateId) {
    try {
      await setContentTaskCompleted(eventId, contentTaskTemplateId, session.sub);
    } catch {
      // non-fatal
    }
  }

  return new Response(
    JSON.stringify({ ok: true, id: photoId, file_url: storedFileUrl ?? fileUrl, file_type: fileType, width, height }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!session) return jsonError('no-session', 401);

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
