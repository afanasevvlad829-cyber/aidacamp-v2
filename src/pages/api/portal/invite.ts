export const prerender = false;
import type { APIRoute } from 'astro';
import { can, requireRole } from '../../../lib/portalPerms';
import { createInvite, revokeInvite } from '../../../lib/portalInvite';

const ALLOWED_ROLES = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'];


const j = (x: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });

export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireRole(locals, ['admin', 'rukovoditel']);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  const body = await request.json().catch(() => ({} as any));
  const action = String(body.action || 'create');
  const userId = String(sub ?? role);

  if (action === 'create') {
    const rolesRaw = Array.isArray(body.roles) ? body.roles : [];
    const roles = rolesRaw
      .map((r: any) => String(r))
      .filter((r: string) => ALLOWED_ROLES.includes(r));
    if (roles.length === 0) return j({ ok: false, error: 'roles required' }, { status: 400 });
    const inv = await createInvite({
      name: body.name != null ? String(body.name).trim() || null : null,
      comment: body.comment != null ? String(body.comment).trim() || null : null,
      roles,
      created_by: userId,
    });
    if (!inv) return j({ ok: false, error: 'failed to create' }, { status: 500 });
    return j({ ok: true, invite: inv });
  }

  if (action === 'revoke') {
    const id = Number(body.id || 0);
    if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
    await revokeInvite(id);
    return j({ ok: true });
  }

  return j({ ok: false, error: 'unknown action' }, { status: 400 });
};
