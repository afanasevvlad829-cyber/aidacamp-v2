export const prerender = false;
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

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
    yclid, gclid,
    landing_url, page_title, referrer,
    ym_client_id,
    screen, viewport, language, tz, session_ms,
  } = body;

  const isReferral = source === 'refer';
  const lines: string[] = [];

  // Заголовок
  lines.push(isReferral ? '🎁 <b>Реферальная заявка!</b>' : '🎯 <b>Новая заявка АйДаКемп</b>');
  lines.push('');

  // Контакт
  lines.push(`📞 <b>${esc(phone)}</b>  |  👶 ${esc(age) || '—'}  |  🏕 ${esc(shift) || '—'}`);
  if (isReferral) lines.push('→ Отправить мерч тому кто поделился!');
  lines.push('');

  // Источник
  const hasSource = utm_source || utm_medium || utm_campaign || utm_term || yclid || gclid || referrer;
  if (hasSource) {
    lines.push('<b>📍 Источник:</b>');
    if (utm_source)   lines.push(`  source: <code>${esc(utm_source)}</code>`);
    if (utm_medium)   lines.push(`  medium: <code>${esc(utm_medium)}</code>`);
    if (utm_campaign) lines.push(`  campaign: <code>${esc(utm_campaign)}</code>`);
    if (utm_content)  lines.push(`  content: <code>${esc(utm_content)}</code>`);
    if (utm_term)     lines.push(`  🔑 ключ: <code>${esc(utm_term)}</code>`);
    if (yclid)        lines.push(`  yclid: <code>${esc(yclid)}</code>`);
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
  if (screen || viewport || language || tz) {
    lines.push('<b>💻 Устройство:</b>');
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

async function createCrmLead(body: Record<string, string>): Promise<number | null> {
  const hostname = process.env.ALFACRM_HOSTNAME;
  const email    = process.env.ALFACRM_EMAIL;
  const apiKey   = process.env.ALFACRM_API_KEY;
  if (!hostname || !email || !apiKey) return null;

  try {
    // Auth
    const authRes = await fetch(`https://${hostname}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    });
    const authData = await authRes.json();
    const token: string = authData?.token;
    if (!token) return null;

    const branchId = 1;
    const headers = { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token };

    // Create customer
    const phone = body.phone?.replace(/\D/g, '') || '';
    const custRes = await fetch(`https://${hostname}/v2api/${branchId}/customer/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Лид ${body.age || ''}`.trim(),
        phone: [phone],
        utm_source: body.utm_source || undefined,
        utm_medium: body.utm_medium || undefined,
        utm_campaign: body.utm_campaign || undefined,
        utm_term: body.utm_term || undefined,
        note: [
          body.shift    ? `Смена: ${body.shift}` : '',
          body.referrer ? `Реферер: ${body.referrer}` : '',
          body.landing_url ? `URL: ${body.landing_url}` : '',
        ].filter(Boolean).join('\n') || undefined,
      }),
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

    // Always save to filesystem first (backup)
    await saveLead(body);

    const token  = process.env.TELEGRAM_BOT_TOKEN  || import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID    || import.meta.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return new Response(JSON.stringify({ ok: false, error: 'No TG token' }), { status: 500 });
    }

    // CRM (best-effort, не блокирует TG)
    const crmId = await createCrmLead(body);

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
