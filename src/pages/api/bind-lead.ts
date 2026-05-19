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

/** Простой парсинг UA без зависимостей */
function parseUA(ua: string): { device: string; browser: string; os: string } {
  const s = ua.toLowerCase();
  // Device
  let device = 'Desktop';
  if (/ipad|tablet|kindle|playbook/.test(s)) device = 'Tablet';
  else if (/iphone|android(?!.*tablet)|mobile|windows phone/.test(s)) device = 'Mobile';
  // OS
  let os = 'Other';
  if (/iphone|ipad|ios/.test(s)) os = 'iOS';
  else if (/android/.test(s)) os = 'Android';
  else if (/windows/.test(s)) os = 'Windows';
  else if (/mac os/.test(s)) os = 'macOS';
  else if (/linux/.test(s)) os = 'Linux';
  // Browser
  let browser = 'Other';
  if (/yabrowser|yaapp/.test(s)) browser = 'Яндекс';
  else if (/vkshare|vk\//.test(s)) browser = 'VK';
  else if (/instagram/.test(s)) browser = 'Instagram';
  else if (/fban|fbav/.test(s)) browser = 'Facebook';
  else if (/telegram/.test(s)) browser = 'Telegram';
  else if (/edg\//.test(s)) browser = 'Edge';
  else if (/chrome/.test(s) && !/chromium/.test(s)) browser = 'Chrome';
  else if (/firefox/.test(s)) browser = 'Firefox';
  else if (/safari/.test(s) && !/chrome/.test(s)) browser = 'Safari';
  return { device, browser, os };
}

async function logBinding(
  lid: number, ymCid: string, ip: string, ua: string, isManager: boolean,
  referrer?: string, screenW?: number,
) {
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
         is_manager boolean default false,
         crm_updated boolean default false,
         referrer text,
         screen_w int,
         created_at timestamptz default now()
       )`,
    );
    await c.query(`ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS is_manager boolean default false`).catch(() => {});
    await c.query(`ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS referrer text`).catch(() => {});
    await c.query(`ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS screen_w int`).catch(() => {});
    await c.query(
      `INSERT INTO pamyatka_bindings(crm_id, ym_client_id, ip, user_agent, is_manager, crm_updated, referrer, screen_w)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [lid, ymCid, ip || null, ua || null, isManager, !isManager, referrer || null, screenW || null],
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
    const isManager = body.is_manager === true;

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

    const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 200) : undefined;
    const screenW = typeof body.screen_w === 'number' ? body.screen_w : undefined;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';
    const { device, browser, os } = parseUA(ua);

    const auth = await alfaAuth();
    if (!auth) {
      await logBinding(lid, ymCid, ip, ua, isManager, referrer, screenW);
      return new Response(JSON.stringify({ ok: true, crm: false }), { status: 200 });
    }

    // Менеджер — только логируем, CRM не трогаем
    if (isManager) {
      await logBinding(lid, ymCid, ip, ua, true, referrer, screenW);
      return new Response(JSON.stringify({ ok: true, crm: false, manager: true }), { status: 200 });
    }

    // Клиент — перезаписываем предыдущую запись ymCid в CRM (last-wins)
    const currentNote = await getCustomerNote(auth.host, auth.token, lid);

    // Удаляем старые ymCid/памятка-записи, пишем только актуальный
    const noteWithoutOldCid = currentNote
      .replace(/\n?\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}\] ymCid:[^\n]+/g, '')
      .trim();
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    // Строим строку с максимумом данных о клиенте
    const parts = [`ymCid:${ymCid}`, `${device}/${os}`, browser];
    if (ip) parts.push(`IP:${ip}`);
    if (referrer) {
      try { parts.push(`ref:${new URL(referrer).hostname}`); } catch { /* skip */ }
    }
    if (screenW) parts.push(`${screenW}px`);
    const newNote = noteWithoutOldCid + `\n[${stamp}] ${parts.join(' | ')}`;

    const ok = await updateCustomerNote(auth.host, auth.token, lid, newNote);
    await logBinding(lid, ymCid, ip, ua, false, referrer, screenW);

    return new Response(JSON.stringify({ ok: true, crm: ok }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
