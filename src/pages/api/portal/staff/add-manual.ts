export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';
import { type PortalRole } from '../../../lib/portalSession';

const VALID: PortalRole[] = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'];

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

/**
 * POST /api/portal/staff/add-manual
 *   form/JSON: full_name, roles (multiple), staff_key?, active?
 * Только admin. Создаёт portal_staff без telegram_id (placeholder).
 * Когда сотрудник позже зайдёт через TG — admin сможет объединить через merge UI.
 */
export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (!p || role !== 'admin') return new Response('Forbidden', { status: 403 });

  let body: Record<string, any>;
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    body = await request.json().catch(() => ({}));
  } else {
    const form = await request.formData();
    body = {};
    for (const [k, v] of form.entries()) {
      if (k === 'roles') {
        body[k] = body[k] ? [...body[k], v] : [v];
      } else body[k] = v;
    }
  }

  const full_name = String(body.full_name ?? '').trim();
  if (!full_name) return new Response('full_name required', { status: 400 });
  const rolesRaw = Array.isArray(body.roles) ? body.roles : (body.roles ? [body.roles] : []);
  const roles = rolesRaw.map(String).filter((r): r is PortalRole => (VALID as string[]).includes(r));
  if (roles.length === 0) return new Response('at least one role required', { status: 400 });
  const staff_key = body.staff_key ? String(body.staff_key).trim() || null : null;
  const activeRole = roles[0];

  await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_staff (full_name, role, roles, active, staff_key, approved_by, approved_at)
       VALUES ($1, $2, $3, TRUE, $4, $5, now())`,
      [full_name, activeRole, roles, staff_key, sub ?? 0],
    );
  });

  return redirect('/portal/staff-admin');
};
