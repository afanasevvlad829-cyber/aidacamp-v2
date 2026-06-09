export const prerender = false;
/**
 * GET /api/portal/alfacrm-groups — список активных групп из AlfaCRM (филиал 5 CAMP).
 * Возвращает [{ id, name, student_count }] отсортированных по имени.
 * Используется в UI расселения для выбора одной или нескольких групп.
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { requireStaff } from '../../../lib/portalPerms';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function getCreds(): Promise<{ H?: string; E?: string; K?: string }> {
  let H = process.env.ALFACRM_HOSTNAME, E = process.env.ALFACRM_EMAIL, K = process.env.ALFACRM_API_KEY;
  if (!H || !E || !K) {
    try {
      const raw = await readFile('/opt/alfacrm-exporter/.env', 'utf8');
      const m: Record<string, string> = {};
      for (const line of raw.split('\n')) {
        const i = line.indexOf('=');
        if (i > 0 && !line.trim().startsWith('#')) {
          m[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
        }
      }
      H = H || m.ALFACRM_HOSTNAME;
      E = E || m.ALFACRM_EMAIL;
      K = K || m.ALFACRM_API_KEY;
    } catch { /* нет файла */ }
  }
  return { H, E, K };
}

async function post(host: string, path: string, body: unknown, token?: string): Promise<any> {
  const r = await fetch(`https://${host}/v2api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token || '' },
    body: JSON.stringify(body),
  });
  return r.json();
}

const BRANCH = 5;

export const GET: APIRoute = async ({ locals }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;

  const { H, E, K } = await getCreds();
  if (!H || !E || !K) return json({ ok: false, error: 'AlfaCRM creds not configured' }, 500);

  try {
    const login = await post(H, '/auth/login', { email: E, api_key: K });
    const token = login?.token;
    if (!token) return json({ ok: false, error: 'AlfaCRM login failed' }, 502);

    const res = await post(H, `/${BRANCH}/group/index`, { page: 0, is_active: 1 }, token);
    const items: any[] = Array.isArray(res?.items) ? res.items : [];

    const groups = items
      .map((g: any) => ({
        id: g.id as number,
        name: (g.name as string) ?? String(g.id),
        student_count: (g.students_count ?? g.student_count ?? null) as number | null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));

    return json({ ok: true, groups });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 502);
  }
};
