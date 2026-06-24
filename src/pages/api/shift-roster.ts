export const prerender = false;
/**
 * /api/shift-roster?shift=1 — список детей смены из AlfaCRM (живой вызов).
 *
 * Смена → группа AlfaCRM (филиал 5 CAMP): 1→660, 2→661, ... 6→665.
 * Возвращает { ok, shift, group, count, kids:[{alfaId,name,gender,age}] }.
 * gender: 1=м, 0=ж, null=не задан (в AlfaCRM поле бывает неточным — правится в UI).
 *
 * Креды: process.env (ALFACRM_HOSTNAME/EMAIL/API_KEY) или /opt/alfacrm-exporter/.env.
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';

const SHIFT_GROUP: Record<number, number> = { 1: 660, 2: 661, 3: 662, 4: 663, 5: 664, 6: 665 };
const BRANCH = 5;

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
    } catch { /* нет файла — вернём пусто */ }
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

function ageFrom(d?: string): number | null {
  if (!d) return null;
  const m = String(d).match(/(\d{2})\.(\d{2})\.(\d{4})/);
  const dt = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(d);
  if (isNaN(+dt)) return null;
  return Math.floor((Date.now() - +dt) / (365.25 * 864e5));
}

export const GET: APIRoute = async ({ url }) => {
  // Принимаем либо group_id напрямую, либо shift (номер смены → группа по маппингу)
  let group: number;
  const groupIdParam = url.searchParams.get('group_id');
  if (groupIdParam) {
    group = Number(groupIdParam);
    if (!Number.isFinite(group) || group <= 0) return json({ ok: false, error: 'invalid group_id' }, 400);
  } else {
    const shift = Number(url.searchParams.get('shift') || '1');
    group = SHIFT_GROUP[shift];
    if (!group) return json({ ok: false, error: 'unknown shift ' + shift }, 400);
  }

  const { H, E, K } = await getCreds();
  if (!H || !E || !K) return json({ ok: false, error: 'AlfaCRM creds not configured' });

  try {
    const login = await post(H, '/auth/login', { email: E, api_key: K });
    const token = login?.token;
    if (!token) return json({ ok: false, error: 'AlfaCRM login failed' });

    const res = await post(H, `/${BRANCH}/customer/index`, { group_id: group, page: 0, is_study: 1 }, token);
    const items = Array.isArray(res?.items) ? res.items : [];
    const kids = items.map((it: any) => ({
      alfaId: it.id,
      name: it.name,
      gender: it.gender === 1 ? 1 : it.gender === 0 ? 0 : null,
      age: ageFrom(it.dob || it.b_date),
    }));
    return json({ ok: true, group, count: kids.length, kids });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
};
