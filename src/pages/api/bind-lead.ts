export const prerender = false;
import type { APIRoute } from 'astro';
import { verifyLid } from '../../lib/leadLink';

const BRANCH = 5;

async function alfaAuth(): Promise<{ host: string; token: string } | null> {
  const host = process.env.ALFACRM_HOSTNAME;
  const email = process.env.ALFACRM_EMAIL;
  const apiKey = process.env.ALFACRM_API_KEY;
  if (!host || !email || !apiKey) return null;
  try {
    const r = await fetch(`https://${host}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    });
    const j = await r.json();
    return j?.token ? { host, token: j.token } : null;
  } catch {
    return null;
  }
}

async function getCustomerNote(host: string, token: string, lid: number): Promise<string> {
  try {
    const r = await fetch(`https://${host}/v2api/${BRANCH}/customer/index?id=${lid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: lid }),
    });
    const j = await r.json();
    const item = j?.items?.[0] ?? j?.item ?? null;
    return item?.note ?? '';
  } catch {
    return '';
  }
}

async function updateCustomerNote(host: string, token: string, lid: number, note: string): Promise<boolean> {
  try {
    const r = await fetch(`https://${host}/v2api/${BRANCH}/customer/update?id=${lid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: lid, note }),
    });
    const j = await r.json();
    return !!j && !j.errors;
  } catch {
    return false;
  }
}

async function logBinding(lid: number, ymCid: string, ip: string, ua: string) {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!dsn) return;
  try {
    const { default: pg } = await import('pg');
    const c = new pg.Client({ connectionString: dsn });
    await c.connect();
    await c.query(
      `CREATE TABLE IF NOT EXISTS pamyatka_bindings(
         id serial primary key,
         crm_id int not null,
         ym_client_id text not null,
         ip text, user_agent text,
         crm_updated boolean default false,
         created_at timestamptz default now()
       )`,
    );
    await c.query(
      `INSERT INTO pamyatka_bindings(crm_id, ym_client_id, ip, user_agent, crm_updated)
       VALUES ($1,$2,$3,$4,$5)`,
      [lid, ymCid, ip || null, ua || null, true],
    );
    await c.end();
  } catch {
    /* best-effort */
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const lidRaw = body.lid;
    const token = body.t;
    const ymCid = body.ym_client_id;

    const lid = Number(lidRaw);
    if (!Number.isInteger(lid) || lid <= 0 || lid > 9999999) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_lid' }), { status: 400 });
    }
    if (typeof token !== 'string' || !verifyLid(lid, token)) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_token' }), { status: 403 });
    }
    if (typeof ymCid !== 'string' || !/^[0-9]{6,40}$/.test(ymCid)) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_cid' }), { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';

    const auth = await alfaAuth();
    if (!auth) {
      await logBinding(lid, ymCid, ip, ua);
      return new Response(JSON.stringify({ ok: true, crm: false }), { status: 200 });
    }

    const currentNote = await getCustomerNote(auth.host, auth.token, lid);
    if (currentNote.includes(`ymCid:${ymCid}`)) {
      return new Response(JSON.stringify({ ok: true, crm: true, dup: true }), { status: 200 });
    }

    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const append = `\n[${stamp}] ymCid:${ymCid}`;
    const newNote = (currentNote || '').trim() + append;

    const ok = await updateCustomerNote(auth.host, auth.token, lid, newNote);
    await logBinding(lid, ymCid, ip, ua);

    return new Response(JSON.stringify({ ok: true, crm: ok }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
