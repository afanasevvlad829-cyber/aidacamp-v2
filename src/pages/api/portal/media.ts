export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { listMedia, attachMedia, deleteMedia, getMedia, reorderMedia } from '../../../lib/portalMedia';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const UPLOADS_ROOT = '/var/www/aidacamp-dev/uploads/portal';
const URL_PREFIX = '/portal/uploads';
const MAX_FILE_BYTES = 500 * 1024 * 1024;
// Все авторизованные роли (включая student) могут загружать медиа в смене.
const ALLOWED_ROLES = new Set(['admin', 'teacher', 'vozhaty', 'rukovoditel', 'student']);

function jerr(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
function jok(data: object) {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function mimeToType(mime: string): 'photo' | 'video' | null {
  if (mime.startsWith('image/')) return 'photo';
  if (mime.startsWith('video/')) return 'video';
  return null;
}

export const GET: APIRoute = async ({ url, cookies }) => {
  const s = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!s) return jerr('unauthorized', 401);
  const entityType = url.searchParams.get('entity_type');
  const entityId = url.searchParams.get('entity_id');
  if (!entityType || !entityId) return jerr('entity_type + entity_id required');
  const items = await listMedia(entityType, entityId);
  return jok({ items });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const s = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!s || !s.sub) return jerr('unauthorized', 401);
  if (!ALLOWED_ROLES.has(s.role)) return jerr('forbidden', 403);

  let form: FormData;
  try { form = await request.formData(); } catch { return jerr('invalid-form'); }

  // Возможно действие — реордеринг (JSON в поле reorder)
  const reorderJson = form.get('reorder');
  if (typeof reorderJson === 'string') {
    try {
      const ids = JSON.parse(reorderJson) as number[];
      if (!Array.isArray(ids)) return jerr('reorder must be array');
      await reorderMedia(ids.map(Number).filter(Number.isFinite));
      return jok({ reordered: ids.length });
    } catch (e: any) {
      return jerr('reorder error: ' + (e?.message ?? 'unknown'), 500);
    }
  }

  const entityType = String(form.get('entity_type') || '').trim();
  const entityId = Number(form.get('entity_id'));
  if (!entityType || !Number.isFinite(entityId) || entityId <= 0) {
    return jerr('entity_type + entity_id required');
  }

  const fileEntry = form.get('file');
  if (!fileEntry || typeof fileEntry === 'string') return jerr('file required');
  const file = fileEntry as File;

  const mime = file.type || 'application/octet-stream';
  const fileType = mimeToType(mime);
  if (!fileType) return jerr('unsupported mime type');

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_FILE_BYTES) return jerr('file too large (max 500MB)', 413);

  const uuid = randomUUID();
  const ext = extname(file.name).replace(/^\./, '') || (fileType === 'photo' ? 'jpg' : 'mp4');
  const relDir = `media/${entityType}/${entityId}`;
  const absDir = join(UPLOADS_ROOT, relDir);
  await mkdir(absDir, { recursive: true });
  const fileName = `${uuid}.${ext}`;
  const relPath = `${relDir}/${fileName}`;
  await writeFile(join(UPLOADS_ROOT, relPath), buffer);
  const fileUrl = `${URL_PREFIX}/${relPath}`;

  const id = await attachMedia({
    entity_type: entityType,
    entity_id: entityId,
    file_url: fileUrl,
    file_path: relPath,
    file_type: fileType,
    mime,
    size_bytes: buffer.byteLength,
    author_telegram_id: s.sub,
    storage_kind: 'local',
  });
  return jok({ id, file_url: fileUrl, file_type: fileType });
};

export const DELETE: APIRoute = async ({ url, cookies }) => {
  const s = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!s || !s.sub) return jerr('unauthorized', 401);
  const idRaw = url.searchParams.get('id');
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return jerr('id required');
  const cur = await getMedia(id);
  if (!cur) return jok({ id });
  // Удалять может: admin/руководитель — любой; остальные — только своё
  const isManager = s.role === 'admin' || s.role === 'rukovoditel';
  if (!isManager && Number(cur.author_telegram_id) !== Number(s.sub)) {
    return jerr('forbidden', 403);
  }
  await deleteMedia(id);
  return jok({ id });
};
