export const prerender = false;
import type { APIRoute } from 'astro';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { verifySessionPayload } from '../../../lib/portalSession';
import { isStaff } from '../../../lib/portalPerms';
import {
  listIssuances, createIssuance, deleteIssuance, updateIssuance, countIssuancesByPrize,
  listCustomPrizes, createCustomPrize, archiveCustomPrize, deleteAllIssuances,
} from '../../../lib/portalPrizeOps';
import { decrementPrizeRemaining } from '../../../lib/portalEconomy';
import { PRIZES } from '../../../lib/portalPrizes';
const UPLOADS_ROOT = process.env.PORTAL_UPLOADS_ROOT || '/var/www/aidacamp-dev/uploads/portal';
const URL_PREFIX = '/portal/uploads';
const MAX_FILE_BYTES = 200 * 1024 * 1024; // 200 МБ — фото/видео

function j(x: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });
}
function auth(cookies: Parameters<APIRoute>[0]['cookies']) {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return null;
  if (!isStaff(p.role)) return null;
  return p as any;
}

async function saveUpload(file: File, subdir: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_FILE_BYTES) throw new Error('file too large');
  const today = new Date().toISOString().slice(0, 10);
  const dir = path.join(UPLOADS_ROOT, subdir, today);
  await fs.mkdir(dir, { recursive: true });
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
  const name = randomUUID() + '.' + ext;
  const filepath = path.join(dir, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buf);
  return `${URL_PREFIX}/${subdir}/${today}/${name}`;
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const action = url.searchParams.get('action');
  try {
    if (action === 'list_custom') {
      return j({ ok: true, items: await listCustomPrizes() });
    }
    if (action === 'list_issuances') {
      const prizeId = url.searchParams.get('prize_id') || undefined;
      const limit = Math.min(500, Number(url.searchParams.get('limit') || 200));
      return j({ ok: true, items: await listIssuances(prizeId, limit) });
    }
    if (action === 'counts') {
      return j({ ok: true, counts: await countIssuancesByPrize() });
    }
    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const ct = request.headers.get('content-type') ?? '';

  try {
    // Multipart — для загрузки файла (вместе с action в form-data)
    if (ct.includes('multipart/form-data')) {
      const form = await request.formData();
      const action = String(form.get('action') || '');

      if (action === 'issue') {
        const prizeId = String(form.get('prize_id') || '').trim();
        if (!prizeId) return j({ ok: false, error: 'prize_id required' }, { status: 400 });
        const fileEntry = form.get('file') as File | null;
        let photo_url: string | null = null;
        let video_url: string | null = null;
        if (fileEntry && fileEntry.size > 0) {
          const url = await saveUpload(fileEntry, 'issuances');
          const mime = fileEntry.type || '';
          if (mime.startsWith('video/')) video_url = url;
          else photo_url = url;
        }
        const id = await createIssuance({
          prize_id: prizeId,
          prize_name: form.get('prize_name')?.toString() || null,
          kid_id: form.get('kid_id') ? Number(form.get('kid_id')) : null,
          kid_name: form.get('kid_name')?.toString() || null,
          issued_by: String((p.sub ?? p.role)),
          photo_url, video_url,
          note: form.get('note')?.toString() || null,
          bongere_price: form.get('bongere_price') ? Number(form.get('bongere_price')) : null,
        });
        // Декремент остатка: для hardcoded prize → portal_prize_state.remaining_qty,
        // для custom (slug начинается с 'custom-') → клиент пусть отдельно архивирует когда нужно.
        let remaining: number | null = null;
        const hardcoded = PRIZES.find((pp) => pp.id === prizeId);
        if (hardcoded) {
          remaining = await decrementPrizeRemaining(prizeId, hardcoded.qty);
        } else if (prizeId.startsWith('custom-')) {
          // Для custom уменьшаем portal_prize_custom.qty напрямую
          const { default: pg } = await import('pg');
          const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
          if (conn) {
            const c = new pg.Client({ connectionString: conn });
            await c.connect();
            try {
              const u = await c.query(
                `UPDATE portal_prize_custom SET qty = GREATEST(qty - 1, 0), updated_at = NOW()
                 WHERE slug = $1 RETURNING qty`,
                [prizeId]
              );
              remaining = Number(u.rows[0]?.qty ?? 0);
            } finally { await c.end(); }
          }
        }
        return j({ ok: true, id, photo_url, video_url, remaining });
      }

      if (action === 'update_issuance') {
        const id = Number(form.get('id'));
        if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
        const patch: Parameters<typeof updateIssuance>[1] = {};
        if (form.has('kid_id')) patch.kid_id = form.get('kid_id') ? Number(form.get('kid_id')) : null;
        if (form.has('kid_name')) patch.kid_name = form.get('kid_name')?.toString() || null;
        if (form.has('bongere_price')) patch.bongere_price = form.get('bongere_price') ? Number(form.get('bongere_price')) : null;
        if (form.has('note')) patch.note = form.get('note')?.toString() || null;
        const fileEntry = form.get('file') as File | null;
        if (fileEntry && fileEntry.size > 0) {
          const uploadUrl = await saveUpload(fileEntry, 'issuances');
          const mime = fileEntry.type || '';
          if (mime.startsWith('video/')) patch.video_url = uploadUrl;
          else patch.photo_url = uploadUrl;
        }
        await updateIssuance(id, patch);
        return j({ ok: true });
      }

      if (action === 'create_custom') {
        const name = String(form.get('name') || '').trim();
        if (!name) return j({ ok: false, error: 'name required' }, { status: 400 });
        const fileEntry = form.get('file') as File | null;
        const img_url = fileEntry && fileEntry.size > 0 ? await saveUpload(fileEntry, 'prizes-custom') : null;
        const r = await createCustomPrize({
          name,
          description: form.get('description')?.toString() || null,
          category: form.get('category')?.toString() || null,
          ozon_price: form.get('ozon_price') ? Number(form.get('ozon_price')) : null,
          qty: form.get('qty') ? Number(form.get('qty')) : 1,
          img_url,
        });
        return j({ ok: true, ...r });
      }

      return j({ ok: false, error: 'unknown multipart action' }, { status: 400 });
    }

    // JSON — для не-файловых операций
    const body = await request.json().catch(() => ({} as any));
    const action = String(body.action || '');

    if (action === 'archive_custom') {
      const id = Number(body.id);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      await archiveCustomPrize(id);
      return j({ ok: true });
    }
    if (action === 'delete_issuance') {
      const id = Number(body.id);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      await deleteIssuance(id);
      return j({ ok: true });
    }
    if (action === 'reset_all_issuances') {
      const deleted = await deleteAllIssuances();
      return j({ ok: true, deleted });
    }
    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};
