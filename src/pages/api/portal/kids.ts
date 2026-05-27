export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { regenerateCode, setKidActive } from '../../../lib/portalKid';

const ALLOWED = new Set(['admin', 'rukovoditel']);

function auth(cookies: Parameters<APIRoute>[0]['cookies']) {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return null;
  if (!ALLOWED.has(p.role)) return null;
  return p;
}

const j = (x: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });

export const POST: APIRoute = async ({ cookies, request }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({} as any));
  const action = String(body.action || '');
  const id = Number(body.id || 0);
  if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
  try {
    if (action === 'regenerate_code') {
      const code = await regenerateCode(id);
      return j({ ok: true, code });
    }
    if (action === 'activate')   { await setKidActive(id, true);  return j({ ok: true }); }
    if (action === 'deactivate') { await setKidActive(id, false); return j({ ok: true }); }
    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};
