export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { mergePendingIntoPlaceholder } from '../../../../lib/portalStaff';

function requireAdmin(locals: App.Locals): { sub: number } | null {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return null;
  return _a.role === 'admin' ? { sub: _a.sub } : null;
}

export const POST: APIRoute = async ({ locals, request }) => {
  const admin = requireAdmin(locals);
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
