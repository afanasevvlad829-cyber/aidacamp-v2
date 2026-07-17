export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../lib/fetchWithTimeout';
import { verifyLid } from '../../lib/leadLink';
import { readVisitorId } from '../../lib/attribution/cookie';

const BRANCH = 5;

// ── Альфа-CRM ────────────────────────────────────────────────────────────────

async function alfaAuth(): Promise<{ host: string; token: string } | null> {
  const host = process.env.ALFACRM_HOSTNAME;
  const email = process.env.ALFACRM_EMAIL;
  const apiKey = process.env.ALFACRM_API_KEY;
  if (!host || !email || !apiKey) return null;
  try {
    const r = await fetchWithTimeout(`https://${host}/v2api/auth/login`, {
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
    const r = await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/customer/index?id=${lid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: lid }),
    });
    const j = await r.json();
    return j?.items?.[0]?.note ?? '';
  } catch {
    return '';
  }
}

async function updateCustomerNote(host: string, token: string, lid: number, note: string): Promise<boolean> {
  try {
    const r = await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/customer/update?id=${lid}`, {
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

/** Полная карточка клиента (для чтения кастомных полей) */
async function getCustomer(host: string, token: string, lid: number): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/customer/index?id=${lid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: lid }),
    });
    const j = await r.json();
    return j?.items?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Дописывает id визита (ubtcuid / domain_userid / ym) в кастомные поля AlfaCRM
 * по принципу fill-if-empty — НЕ перетирая значение, записанное с формы
 * (та же сессия, что рекламный визит = более точный сигнал). Коды полей — из .env.
 */
async function bindAndataFields(
  host: string,
  token: string,
  lid: number,
  vals: { ubtcuid?: string; domainid?: string; ymuid?: string },
): Promise<void> {
  const fUbt = process.env.ALFACRM_FIELD_UBTCUID;
  const fDom = process.env.ALFACRM_FIELD_DOMAINID;
  const fYm = process.env.ALFACRM_FIELD_YMUID;
  if (!fUbt && !fDom && !fYm) return;
  if (!vals.ubtcuid && !vals.domainid && !vals.ymuid) return;
  try {
    const cust = await getCustomer(host, token, lid);
    if (!cust) return;
    const upd: Record<string, string> = {};
    if (fUbt && vals.ubtcuid && !cust[fUbt]) upd[fUbt] = vals.ubtcuid;
    if (fDom && vals.domainid && !cust[fDom]) upd[fDom] = vals.domainid;
    if (fYm && vals.ymuid && !cust[fYm]) upd[fYm] = vals.ymuid;
    if (!Object.keys(upd).length) return;
    await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/customer/update?id=${lid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: lid, ...upd }),
    });
  } catch {
    /* best-effort */
  }
}

// ── UA-парсер ─────────────────────────────────────────────────────────────────

function parseUA(ua: string): { device: string; browser: string; os: string } {
  const s = ua.toLowerCase();
  let device = 'Desktop';
  if (/ipad|tablet|kindle|playbook/.test(s)) device = 'Tablet';
  else if (/iphone|android(?!.*tablet)|mobile|windows phone/.test(s)) device = 'Mobile';
  let os = 'Other';
  if (/iphone|ipad|ios/.test(s)) os = 'iOS';
  else if (/android/.test(s)) os = 'Android';
  else if (/windows/.test(s)) os = 'Windows';
  else if (/mac os/.test(s)) os = 'macOS';
  else if (/linux/.test(s)) os = 'Linux';
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

// ── PostgreSQL ────────────────────────────────────────────────────────────────

type ExtraData = {
  referrer?: string; screenW?: number; screenH?: number;
  lang?: string; tz?: string; ymFirstVisit?: string;
  vkVid?: string; utm?: Record<string, string>; visitorId?: string;
};

/** Авто-детект менеджера: тот же ymCid или IP открывал другие лиды за 2 часа */
async function detectManagerInDB(ymCid: string, ip: string, lid: number): Promise<boolean> {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!dsn) return false;
  try {
    const { default: pg } = await import('pg');
    const c = new pg.Client({ connectionString: dsn });
    await c.connect();
    const res = await c.query<{ cnt: string }>(
      `SELECT COUNT(DISTINCT crm_id)::text AS cnt FROM pamyatka_bindings
       WHERE crm_id != $3
         AND created_at > NOW() - INTERVAL '2 hours'
         AND (ym_client_id = $1 OR (LENGTH($2) > 4 AND ip = $2))`,
      [ymCid, ip, lid],
    );
    await c.end();
    return parseInt(res.rows[0]?.cnt ?? '0', 10) >= 1;
  } catch {
    return false;
  }
}

async function logBinding(
  lid: number, ymCid: string, ip: string, ua: string,
  isManager: boolean, extra: ExtraData = {},
) {
  const dsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!dsn) return;
  try {
    const { default: pg } = await import('pg');
    const c = new pg.Client({ connectionString: dsn });
    await c.connect();
    await c.query(`CREATE TABLE IF NOT EXISTS pamyatka_bindings(
      id serial primary key,
      crm_id int not null,
      ym_client_id text not null,
      ip text, user_agent text,
      is_manager boolean default false,
      crm_updated boolean default false,
      referrer text, screen_w int, screen_h int,
      lang text, tz text,
      ym_first_visit date, vk_vid text, utm jsonb,
      created_at timestamptz default now()
    )`);
    for (const col of [
      'is_manager boolean default false', 'crm_updated boolean default false',
      'referrer text', 'screen_w int', 'screen_h int',
      'lang text', 'tz text', 'ym_first_visit date', 'vk_vid text', 'utm jsonb', 'visitor_id text',
    ]) {
      await c.query(`ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }
    await c.query(
      `INSERT INTO pamyatka_bindings(
         crm_id, ym_client_id, ip, user_agent, is_manager, crm_updated,
         referrer, screen_w, screen_h, lang, tz, ym_first_visit, vk_vid, utm, visitor_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        lid, ymCid, ip || null, ua || null, isManager, true,
        extra.referrer || null,
        extra.screenW || null, extra.screenH || null,
        extra.lang || null, extra.tz || null,
        extra.ymFirstVisit || null,
        extra.vkVid || null,
        extra.utm ? JSON.stringify(extra.utm) : null,
        extra.visitorId || null,
      ],
    );
    await c.end();
  } catch { /* best-effort */ }
}

// ── Основной хендлер ──────────────────────────────────────────────────────────

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const lidRaw  = body.lid;
    const token   = body.t;
    const ymCid   = body.ym_client_id;

    const lid = Number(lidRaw);
    if (!Number.isInteger(lid) || lid <= 0 || lid > 9_999_999) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_lid' }), { status: 400 });
    }
    if (typeof token !== 'string' || !verifyLid(lid, token)) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_token' }), { status: 403 });
    }
    if (typeof ymCid !== 'string' || !/^[0-9]{6,40}$/.test(ymCid)) {
      return new Response(JSON.stringify({ ok: false, error: 'bad_cid' }), { status: 400 });
    }

    // Собираем все данные от клиента
    const extra: ExtraData = {
      referrer:     typeof body.referrer      === 'string' ? body.referrer.slice(0, 300)     : undefined,
      screenW:      typeof body.screen_w      === 'number' ? body.screen_w                   : undefined,
      screenH:      typeof body.screen_h      === 'number' ? body.screen_h                   : undefined,
      lang:         typeof body.lang          === 'string' ? body.lang.slice(0, 20)          : undefined,
      tz:           typeof body.tz            === 'string' ? body.tz.slice(0, 50)            : undefined,
      ymFirstVisit: typeof body.ym_first_visit === 'string' ? body.ym_first_visit.slice(0, 10) : undefined,
      vkVid:        typeof body.vk_vid        === 'string' ? body.vk_vid.slice(0, 50)        : undefined,
      utm:          (body.utm && typeof body.utm === 'object') ? body.utm as Record<string, string> : undefined,
      visitorId:    readVisitorId(request) ?? undefined,
    };

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             || request.headers.get('x-real-ip') || '';
    const ua = request.headers.get('user-agent') || '';
    const { device, browser, os } = parseUA(ua);

    // Явный флаг менеджера из localStorage (менеджер открыл ссылку из /admin/p-link)
    const explicitManager = body.is_manager === true;

    // Авто-детект менеджера: тот же профиль открывал другие лиды за 2 часа
    const autoManager = !explicitManager
      ? await detectManagerInDB(ymCid, ip, lid)
      : false;

    const isManager = explicitManager || autoManager;

    // ── Логируем в БД всегда ──────────────────────────────────────────────────
    await logBinding(lid, ymCid, ip, ua, isManager, extra);

    // ── Строим строку для CRM (все данные в одну строку) ─────────────────────
    const stamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const parts: string[] = [];

    if (isManager)           parts.push(explicitManager ? '[МГР]' : '[МГР-авто]');
    parts.push(`ymCid:${ymCid}`);
    parts.push(`${device}/${os}`);
    parts.push(browser);
    if (ip)                  parts.push(`IP:${ip}`);
    if (extra.referrer) {
      try { parts.push(`ref:${new URL(extra.referrer).hostname}`); } catch { parts.push(`ref:${extra.referrer.slice(0, 40)}`); }
    }
    if (extra.utm?.utm_source) parts.push(`utm:${extra.utm.utm_source}/${extra.utm.utm_medium ?? '?'}${extra.utm.utm_campaign ? '/' + extra.utm.utm_campaign : ''}`);
    if (extra.ymFirstVisit)  parts.push(`на сайте с ${extra.ymFirstVisit}`);
    if (extra.vkVid)         parts.push(`vk:${extra.vkVid.slice(0, 16)}`);
    if (extra.screenW && extra.screenH) parts.push(`${extra.screenW}×${extra.screenH}`);
    if (extra.lang)          parts.push(extra.lang);
    if (extra.tz)            parts.push(extra.tz);

    const newLine = `\n[${stamp}] ${parts.join(' | ')}`;

    // ── Пишем в CRM: ВСЕГДА APPEND, ничего не перетираем ────────────────────
    const auth = await alfaAuth();
    if (!auth) {
      return new Response(JSON.stringify({ ok: true, crm: false }), { status: 200 });
    }

    const currentNote = await getCustomerNote(auth.host, auth.token, lid);
    const newNote = currentNote + newLine;

    const ok = await updateCustomerNote(auth.host, auth.token, lid, newNote);

    // Andata: матчинг визита постфактум — дописываем id в кастомные поля (fill-if-empty).
    // Не для менеджера, чтобы его устройство не привязалось к чужому заказу.
    if (!isManager) {
      const ubt = typeof body.ubtcuid === 'string' ? body.ubtcuid.slice(0, 100) : undefined;
      const dom = typeof body.domain_userid === 'string' ? body.domain_userid.slice(0, 100) : undefined;
      await bindAndataFields(auth.host, auth.token, lid, { ubtcuid: ubt, domainid: dom, ymuid: ymCid });
    }

    return new Response(JSON.stringify({ ok: true, crm: ok, manager: isManager }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
