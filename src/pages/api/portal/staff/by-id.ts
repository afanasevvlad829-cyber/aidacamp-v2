export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../../lib/portalPerms';
import { setActiveById, deleteStaffById, setNameById } from '../../../../lib/portalStaff';

/**
 * POST /api/portal/staff/by-id
 *   form: id, action ('activate'|'deactivate'|'delete')
 * Только admin. Работает по PK id (включает placeholder без telegram_id).
 */
export const POST: APIRoute = async ({ locals, request, redirect }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (role !== 'admin') return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const id = Number(form.get('id'));
  const action = String(form.get('action') ?? '');
  if (!Number.isFinite(id) || id <= 0) return new Response('bad id', { status: 400 });

  if (action === 'activate') await setActiveById(id, true);
  else if (action === 'deactivate') await setActiveById(id, false);
  else if (action === 'delete') await deleteStaffById(id);
  else if (action === 'rename') {
    const name = String(form.get('full_name') ?? '').trim();
    if (!name) return new Response('empty name', { status: 400 });
    await setNameById(id, name);
  }
  else return new Response('bad action', { status: 400 });

  return redirect('/portal/staff-admin');
};
