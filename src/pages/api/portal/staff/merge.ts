export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../../lib/portalSession';
import { mergePendingIntoPlaceholder } from '../../../../lib/portalStaff';

function requireAdmin(cookies: Parameters<APIRoute>[0]['cookies']): { sub?: number } | null {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  return p && p.role === 'admin' ? { sub: p.sub } : null;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const admin = requireAdmin(cookies);
  if (!admin) return new Response('Forbidden', { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response('invalid JSON', { status: 400 });
  }

  const { pending_id, placeholder_id } = body as Record<string, unknown>;
  const pendingId = Number(pending_id);
  const placeholderId = Number(placeholder_id);

  if (!Number.isFinite(pendingId) || pendingId <= 0) {
    return new Response(JSON.stringify({ ok: false, error: 'bad pending_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!Number.isFinite(placeholderId) || placeholderId <= 0) {
    return new Response(JSON.stringify({ ok: false, error: 'bad placeholder_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await mergePendingIntoPlaceholder(pendingId, placeholderId, admin.sub ?? 0);

  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 400,
    headers: { 'Content-Type': 'application/json' },
  });
};
