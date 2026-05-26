export const prerender = false;
import type { APIRoute } from 'astro';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { getPhotoById, deletePhotoRow } from '../../../../lib/portalPhoto';

const UPLOADS_ROOT = '/var/www/aidacamp-dev/uploads/portal';
const DELETE_ROLES = new Set(['admin', 'rukovoditel']);

function json(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * DELETE /api/portal/photo/:id
 * Только admin и руководитель могут удалять загруженные фото/видео.
 */
export const DELETE: APIRoute = async ({ params, cookies }) => {
  const payload = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!payload?.role) return json({ ok: false, error: 'unauthorized' }, 401);
  if (!DELETE_ROLES.has(payload.role)) return json({ ok: false, error: 'forbidden' }, 403);

  const id = Number(params.id);
  if (!Number.isFinite(id) || id <= 0) return json({ ok: false, error: 'bad id' }, 400);

  const photo = await getPhotoById(id);
  if (!photo) return json({ ok: false, error: 'not found' }, 404);

  // Удалить файл (best-effort — если не получилось, продолжим удалять запись).
  if (photo.storage_kind === 'local' && photo.file_path) {
    const path = photo.file_path.startsWith('/') ? photo.file_path : join(UPLOADS_ROOT, photo.file_path);
    try { await unlink(path); } catch (e) { /* файл уже удалён или нет прав — игнорим */ }
  }

  const ok = await deletePhotoRow(id);
  if (!ok) return json({ ok: false, error: 'db delete failed' }, 500);
  return json({ ok: true });
};
