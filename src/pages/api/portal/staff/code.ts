export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { regenerateStaffCode, clearStaffCode } from '../../../../lib/portalStaff';

/**
 * POST /api/portal/staff/code  (JSON)
 *   body: { id: number, action: 'generate' | 'revoke' }
 * Только admin. Работает по PK id (включая placeholder без telegram_id).
 *   generate → выдаёт/перевыпускает персональный 6-значный код-вход → { ok, code }
 *   revoke   → убирает код (останется только вход через TG)            → { ok }
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const p = verifySessionPayload(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  if (!p || p.role !== 'admin') {
    return new Response(JSON.stringify({ ok: false, error: 'forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => ({} as any));
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!Number.isFinite(id) || id <= 0) {
    return new Response(JSON.stringify({ ok: false, error: 'bad id' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (action === 'generate') {
    const code = await regenerateStaffCode(id);
    if (!code) {
      return new Response(JSON.stringify({ ok: false, error: 'не удалось сгенерировать' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true, code }), { headers: { 'Content-Type': 'application/json' } });
  }

  if (action === 'revoke') {
    await clearStaffCode(id);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ ok: false, error: 'bad action' }), {
    status: 400, headers: { 'Content-Type': 'application/json' },
  });
};
