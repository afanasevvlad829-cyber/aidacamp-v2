export const prerender = false;
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sendAndataEvent, andataDatetime, andataPhone } from '../../lib/andata';
import { allShifts } from '../../data/shifts';

/** Цена выбранной смены в рублях по её названию (для Andata order_value) */
function shiftPrice(shift: string): number | undefined {
  const s = (shift || '').trim().toLowerCase();
  if (!s) return undefined;
  const found =
    allShifts.find((x) => x.name.trim().toLowerCase() === s) ||
    allShifts.find((x) => s.includes(x.name.trim().toLowerCase()));
  if (!found) return undefined;
  const n = parseInt(String(found.price).replace(/\D/g, ''), 10);
  return Number.isNaN(n) ? undefined : n;
}

const LEADS_DIR = '/var/www/aidacamp-dev/leads';

async function saveLead(lead: Record<string, unknown>) {
  try {
    await mkdir(LEADS_DIR, { recursive: true });
    const line = JSON.stringify({ ...lead, ts: new Date().toISOString() }) + '\n';
    await appendFile(join(LEADS_DIR, 'leads.jsonl'), line);
  } catch {
    // filesystem backup is best-effort
  }
}

async function saveLeadToPg(
  body: Record<string, string>,
  extra: { ip: string; userAgent: string; crmId: number | null },
) {
  const pgDsn = process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || '';
  if (!pgDsn) return;
  try {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: pgDsn });
    await client.connect();
    await client.query(
      `INSERT INTO leads_log (
        phone, age, shift, source,
        utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        yclid, ysclid, gclid,
        landing_url, page_title, referrer,
        form_id, ym_client_id,
        screen, viewport, language, tz, session_ms,
        crm_id, ip, user_agent, raw
      ) VALUES (
        $1,$2,$3,$4,
        $5,$6,$7,$8,$9,
        $10,$11,$12,
        $13,$14,$15,
        $16,$17,
        $18,$19,$20,$21,$22,
        $23,$24,$25,$26
      )`,
      [
        body.phone || null, body.age || null, body.shift || null, body.source || null,
        body.utm_source || null, body.utm_medium || null, body.utm_campaign || null,
        body.utm_content || null, body.utm_term || null,
        body.yclid || null, body.ysclid || null, body.gclid || null,
        body.landing_url || null, body.page_title || null, body.referrer || null,
        body.form_id || null, body.ym_client_id || null,
        body.screen || null, body.viewport || null, body.language || null,
        body.tz || null,
        body.session_ms ? parseInt(body.session_ms, 10) : null,
        extra.crmId, extra.ip || null, extra.userAgent || null, JSON.stringify(body),
      ],
    );
    await client.end();
  } catch {
    // best-effort — не блокируем ответ
  }
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildTgText(body: Record<string, string>, crmId?: number | null): string {
  const {
    phone, age, shift, source,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    yclid, ysclid, gclid,
    landing_url, page_title, referrer,
    ym_client_id,
    device, browser,
    screen, viewport, language, tz, session_ms,
  } = body;

  const isReferral = source === 'refer';
  const lines: string[] = [];

  // Заголовок
  lines.push(isReferral ? '🎁 <b>Реферальная заявка!</b>' : '🎯 <b>Новая заявка АйДаКемп</b>');
  lines.push('');

  // Контакт
  lines.push(`📞 <b>${esc(phone)}</b>  |  👶 ${esc(age) || '—'}  |  🏕 ${esc(shift) || '—'}`);
  if (body.call_time) lines.push(`⏰ Позвонить: <b>${esc(body.call_time)}</b>`);
  if (isReferral) lines.push('→ Отправить мерч тому кто поделился!');
  lines.push('');

  // Источник
  const hasSource = utm_source || utm_medium || utm_campaign || utm_term || yclid || ysclid || gclid || referrer;
  if (hasSource) {
    lines.push('<b>📍 Источник:</b>');
    if (utm_source)   lines.push(`  source: <code>${esc(utm_source)}</code>`);
    if (utm_medium)   lines.push(`  medium: <code>${esc(utm_medium)}</code>`);
    if (utm_campaign) lines.push(`  campaign: <code>${esc(utm_campaign)}</code>`);
    if (utm_content)  lines.push(`  content: <code>${esc(utm_content)}</code>`);
    if (utm_term)     lines.push(`  ключ: <code>${esc(utm_term)}</code>`);
    if (yclid)        lines.push(`  yclid: <code>${esc(yclid)}</code>`);
    if (ysclid)       lines.push(`  ysclid: <code>${esc(ysclid)}</code>`);
    if (gclid)        lines.push(`  gclid: <code>${esc(gclid)}</code>`);
    if (referrer)     lines.push(`  реферер: <code>${esc(String(referrer).slice(0, 80))}</code>`);
    lines.push('');
  }

  // Поведение
  lines.push('<b>🌐 Поведение:</b>');
  if (page_title)  lines.push(`  страница: ${esc(page_title)}`);
  if (landing_url) lines.push(`  URL: <code>${esc(String(landing_url).slice(0, 100))}</code>`);
  if (session_ms) {
    const sec = Math.round(Number(session_ms) / 1000);
    lines.push(`  время на сайте: ${sec} сек`);
  }
  lines.push('');

  // Устройство
  if (screen || viewport || language || tz || device) {
    lines.push('<b>💻 Устройство:</b>');
    if (device) {
      const browserPart = browser ? ` · ${esc(browser)}` : '';
      lines.push(`  <b>${esc(device)}</b>${browserPart}`);
    }
    if (screen && viewport) lines.push(`  экран: ${esc(screen)} | viewport: ${esc(viewport)}`);
    if (language) lines.push(`  язык: ${esc(language)}${tz ? ` | tz: ${esc(tz)}` : ''}`);
    lines.push('');
  }

  // IDs
  const hasIds = ym_client_id || crmId;
  if (hasIds) {
    lines.push('<b>🆔 IDs:</b>');
    if (ym_client_id) lines.push(`  Метрика: <code>${esc(ym_client_id)}</code>`);
    if (crmId)        lines.push(`  CRM: <b>#${crmId}</b>`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function buildCrmNote(body: Record<string, string>): string {
  const lines: string[] = [];

  if (body.age)   lines.push(`Возраст: ${body.age}`);
  if (body.shift) lines.push(`Смена: ${body.shift}`);
  if (body.call_time) lines.push(`✅ Позвонить: ${body.call_time}`);
  if (body.form_id) lines.push(`Форма: ${body.form_id}`);

  // Атрибуция
  const utmParts = [
    body.utm_source   ? `source=${body.utm_source}` : '',
    body.utm_medium   ? `medium=${body.utm_medium}` : '',
    body.utm_campaign ? `campaign=${body.utm_campaign}` : '',
    body.utm_content  ? `content=${body.utm_content}` : '',
    body.utm_term     ? `term=${body.utm_term}` : '',
  ].filter(Boolean);
  if (utmParts.length) lines.push(`UTM: ${utmParts.join(' | ')}`);
  if (body.yclid)  lines.push(`yclid: ${body.yclid}`);
  if (body.ysclid) lines.push(`ysclid: ${body.ysclid}`);
  if (body.gclid)  lines.push(`gclid: ${body.gclid}`);

  // Страница
  if (body.landing_url) lines.push(`URL: ${body.landing_url}`);
  if (body.page_title)  lines.push(`Страница: ${body.page_title}`);
  if (body.referrer)    lines.push(`Реферер: ${body.referrer}`);

  // Время на сайте
  if (body.session_ms) {
    const sec = Math.round(Number(body.session_ms) / 1000);
    lines.push(`Время на сайте: ${sec} сек`);
  }

  // Устройство
  if (body.screen)    lines.push(`Экран: ${body.screen}`);
  if (body.viewport)  lines.push(`Viewport: ${body.viewport}`);
  if (body.language)  lines.push(`Язык: ${body.language}`);
  if (body.tz)        lines.push(`Timezone: ${body.tz}`);

  // Метрика clientID (для офлайн-конверсий)
  if (body.ym_client_id) lines.push(`clientID Метрики: ${body.ym_client_id}`);

  return lines.join('\n') || '';
}

async function createCrmLead(body: Record<string, string>): Promise<number | null> {
  const hostname = process.env.ALFACRM_HOSTNAME;
  const email    = process.env.ALFACRM_EMAIL;
  const apiKey   = process.env.ALFACRM_API_KEY;
  if (!hostname || !email || !apiKey) return null;

  try {
    // Auth (один токен на всё)
    const authRes = await fetch(`https://${hostname}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    });
    const authData = await authRes.json();
    const token: string = authData?.token;
    if (!token) return null;

    const headers = { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token };
    const phone = body.phone?.replace(/\D/g, '') || '';

    // Кастомные поля для связки с Andata. Сами поля создаются в админке AlfaCRM,
    // а их коды задаются в .env (ALFACRM_FIELD_UBTCUID / _DOMAINID / _YMUID).
    // Пока коды не заданы — поля не пишем (order_new работает и без них).
    const cf: Record<string, string> = {};
    const fUbt = process.env.ALFACRM_FIELD_UBTCUID;
    const fDom = process.env.ALFACRM_FIELD_DOMAINID;
    const fYm  = process.env.ALFACRM_FIELD_YMUID;
    if (fUbt && body.ubtcuid)        cf[fUbt] = body.ubtcuid;
    if (fDom && body.domain_userid)  cf[fDom] = body.domain_userid;
    if (fYm  && body.ym_client_id)   cf[fYm]  = body.ym_client_id;

    const payload = {
      name: `Лид ${body.age || ''}`.trim(),
      phone: [phone],
      // UTM
      utm_source:   body.utm_source   || undefined,
      utm_medium:   body.utm_medium   || undefined,
      utm_campaign: body.utm_campaign || undefined,
      utm_content:  body.utm_content  || undefined,
      utm_term:     body.utm_term     || undefined,
      // Полная заметка: смена, URL, устройство, клики, время на сайте
      note: buildCrmNote(body),
      // Идентификаторы визита для Andata (если поля настроены)
      ...cf,
    };

    // Лагерь — филиал 5
    const custRes = await fetch(`https://${hostname}/v2api/5/customer/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const custData = await custRes.json();
    return custData?.id ?? null;
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: Record<string, string> = await request.json();
    const { phone, age, shift, source } = body;

    // Извлекаем IP и User-Agent для логирования
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '';
    const userAgent = request.headers.get('user-agent') || '';

    // Always save to filesystem first (backup)
    await saveLead(body);

    const token  = process.env.TELEGRAM_BOT_TOKEN  || import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID    || import.meta.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return new Response(JSON.stringify({ ok: false, error: 'No TG token' }), { status: 500 });
    }

    // CRM (best-effort, не блокирует TG)
    const crmId = await createCrmLead(body);

    // PG лог (best-effort)
    await saveLeadToPg(body, { ip, userAgent, crmId });

    // Andata — событие order_new (best-effort, не блокирует ответ).
    // Шлём только если CRM создал заказ — чтобы order_id == customer_id
    // и cron смог связать будущую оплату (order_paid) с этим визитом.
    if (crmId) {
      await sendAndataEvent({
        eventName: 'order_new',
        source: 'aidacamp-site',
        ubtcuid: body.ubtcuid,
        domainid: body.domain_userid,
        data: {
          order_id: crmId,
          order_date_create: andataDatetime(),
          age_child: body.age || undefined,
          order_value: shiftPrice(body.shift || ''),
          input_phone: andataPhone(body.phone),
          input_email: body.email || undefined,
          ym_uid: body.ym_client_id || undefined,
        },
      });
    }

    const text = buildTgText(body, crmId);

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    const tgData = await res.json();

    if (!tgData.ok) {
      return new Response(JSON.stringify({ ok: true, tg: false, crm_id: crmId }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true, crm_id: crmId }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
