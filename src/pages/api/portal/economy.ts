export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import {
  listPrizeStates, replacePrizeState, upsertPrizeState,
  listActivities, upsertActivity, deleteActivity,
} from '../../../lib/portalEconomy';

const ALLOWED = new Set(['admin', 'rukovoditel']);

function auth(cookies: Parameters<APIRoute>[0]['cookies']) {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return null;
  if (!ALLOWED.has(p.role)) return null;
  return p;
}

const j = (x: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });

export const GET: APIRoute = async ({ cookies }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const [states, activities] = await Promise.all([listPrizeStates(), listActivities()]);
  return j({ ok: true, prize_states: states, activities });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({} as any));
  const action = String(body.action || '');
  const userId = String((p as any).sub || (p as any).role || 'admin');

  try {
    if (action === 'set_prize') {
      const id = String(body.prize_id || '');
      if (!id) return j({ ok: false, error: 'prize_id required' }, { status: 400 });
      await upsertPrizeState(id, {
        hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
        bongere_price: body.bongere_price === null ? null : (body.bongere_price != null ? Number(body.bongere_price) : undefined),
        custom_photo: typeof body.custom_photo === 'string' ? body.custom_photo : undefined,
      }, userId);
      return j({ ok: true });
    }

    if (action === 'import_localstorage') {
      // body.deleted: string[], body.bongere: Record<id, number>, body.photos: Record<id, dataUrl>
      const deleted = Array.isArray(body.deleted) ? body.deleted.map(String) : [];
      const bongere = body.bongere && typeof body.bongere === 'object' ? body.bongere : {};
      const photos  = body.photos  && typeof body.photos  === 'object' ? body.photos  : {};
      const ids = new Set<string>([...deleted, ...Object.keys(bongere), ...Object.keys(photos)]);
      let n = 0;
      for (const id of ids) {
        const hidden = deleted.includes(id);
        const price = bongere[id] != null && !isNaN(Number(bongere[id])) ? Number(bongere[id]) : null;
        const photo = typeof photos[id] === 'string' ? String(photos[id]) : null;
        await replacePrizeState(id, hidden, price, photo, userId);
        n++;
      }
      return j({ ok: true, imported: n });
    }

    if (action === 'upsert_activity') {
      const id = await upsertActivity({
        id: body.id ? Number(body.id) : undefined,
        name: String(body.name || '').trim(),
        description: body.description != null ? String(body.description) : null,
        category: body.category != null ? String(body.category) : null,
        base_price: body.base_price != null && body.base_price !== '' ? Number(body.base_price) : null,
        participants_hint: body.participants_hint != null && body.participants_hint !== '' ? Number(body.participants_hint) : null,
        sort: body.sort != null ? Number(body.sort) : 0,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      });
      return j({ ok: true, id });
    }

    if (action === 'delete_activity') {
      const id = Number(body.id);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      await deleteActivity(id);
      return j({ ok: true });
    }

    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};
