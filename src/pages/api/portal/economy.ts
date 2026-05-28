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
      // Различаем три случая для bongere_price:
      //   - null (явно)  → стереть значение в БД
      //   - number       → установить
      //   - undefined    → не трогать
      const hasPrice = 'bongere_price' in body;
      const priceVal = hasPrice
        ? (body.bongere_price === null ? null : Number(body.bongere_price))
        : undefined;
      if (hasPrice) {
        // Используем raw SQL чтобы можно было записать NULL
        const { default: pg } = await import('pg');
        const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
        const c = new pg.Client({ connectionString: conn });
        await c.connect();
        try {
          await c.query(
            `INSERT INTO portal_prize_state (prize_id, hidden, bongere_price, updated_at, updated_by)
             VALUES ($1, FALSE, $2, NOW(), $3)
             ON CONFLICT (prize_id) DO UPDATE SET
               bongere_price = $2,
               updated_at = NOW(),
               updated_by = $3`,
            [id, priceVal, userId]
          );
        } finally { await c.end(); }
      }
      // Прочие поля (hidden, custom_photo) — через upsertPrizeState с COALESCE
      if (typeof body.hidden === 'boolean' || typeof body.custom_photo === 'string') {
        await upsertPrizeState(id, {
          hidden: typeof body.hidden === 'boolean' ? body.hidden : undefined,
          custom_photo: typeof body.custom_photo === 'string' ? body.custom_photo : undefined,
        }, userId);
      }
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
      const num = (v: any) => (v != null && v !== '' && !isNaN(Number(v))) ? Number(v) : null;
      const id = await upsertActivity({
        id: body.id ? Number(body.id) : undefined,
        name: String(body.name || '').trim(),
        description: body.description != null ? String(body.description) : null,
        category: body.category != null ? String(body.category) : null,
        base_price: num(body.base_price),
        participants_hint: num(body.participants_hint),
        target_days: num(body.target_days),
        target_share_pct: num(body.target_share_pct),
        repeat_multiplier: num(body.repeat_multiplier),
        ...(('custom_price' in body) ? { custom_price: body.custom_price === null ? null : num(body.custom_price) } : {}),
        sort: body.sort != null ? Number(body.sort) : 0,
        archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      });
      return j({ ok: true, id });
    }

    if (action === 'set_activity_custom_price') {
      // Узкий эндпоинт: «вписал цену вручную» / «сбросил к рекомендованной» (custom_price = null)
      const id = Number(body.id || 0);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      const v = body.custom_price === null
        ? null
        : (body.custom_price != null && body.custom_price !== '' && !isNaN(Number(body.custom_price))
            ? Number(body.custom_price) : null);
      const { default: pg } = await import('pg');
      const conn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
      if (conn) {
        const c = new pg.Client({ connectionString: conn });
        await c.connect();
        try {
          await c.query(`UPDATE portal_activity_offer SET custom_price = $2, updated_at = NOW() WHERE id = $1`, [id, v]);
        } finally { await c.end(); }
      }
      return j({ ok: true });
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
