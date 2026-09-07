// SEO weekly positions check — Пн 10:00 МСК
// aidacamp: из PostgreSQL | остальные: Topvisor API
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { notify } from './notify.mjs';
const require = createRequire(import.meta.url);
const { Client } = require('/opt/mcp/node_modules/pg');

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const TV_TOKEN = env.TOPVISOR_TOKEN, TV_USER = env.TOPVISOR_USER_ID;
const CONN = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';

const fmt = d => d.toISOString().slice(0, 10);
const today = fmt(new Date());
const weekAgo = fmt(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

// ── Брендовый спрос (Wordstat через локальный MCP-сервер) ────────────────────
// Прямые запросы к arsenkin.ru из скриптов запрещены (конфликт с очередью задач
// MCP) — ходим через свой MCP на 127.0.0.1:3457, у него кэш wordstat 24ч.
// История пишется в BRAND_LOG (dата|запрос|base|quoted) — для дельты к прошлой неделе.
const MCP_BASE = 'http://127.0.0.1:3457';
const BRAND_QUERIES = ['айдакемп', 'айда кодить', 'codims', 'кодимс'];
const BRAND_LOG = '/opt/scripts/brand-wordstat.log';

async function mcpParse(res) {
  const body = await res.text();
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) {
    for (const line of body.split('\n'))
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    throw new Error('SSE без data-фрейма');
  }
  return body ? JSON.parse(body) : null;
}
function mcpHeaders(sessionId) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (env.MCP_SECRET) h.Authorization = `Bearer ${env.MCP_SECRET}`;
  if (sessionId) h['mcp-session-id'] = sessionId;
  return h;
}
async function mcpRpc(sessionId, payload) {
  const res = await fetch(`${MCP_BASE}/mcp`, {
    method: 'POST', headers: mcpHeaders(sessionId), body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  return { json: await mcpParse(res), sessionId: res.headers.get('mcp-session-id') || sessionId };
}

async function checkBrand() {
  const { appendFileSync } = await import('fs');
  const init = await mcpRpc(null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'seo-weekly-brand', version: '1.0' } },
  });
  const sid = init.sessionId;
  if (!sid || init.json?.error) throw new Error('MCP handshake: ' + (init.json?.error?.message || 'нет session-id'));
  await mcpRpc(sid, { jsonrpc: '2.0', method: 'notifications/initialized' });
  try {
    const { json } = await mcpRpc(sid, {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'run', arguments: { service: 'arsenkin', action: 'run_sync',
        params: { tool: 'wordstat', data: { queries: BRAND_QUERIES, regions: [225], ws: ['base', 'quoted'], type: 1 } } } },
    });
    if (json?.error || json?.result?.isError)
      throw new Error(json?.error?.message || json.result.content?.[0]?.text?.slice(0, 150) || 'isError');
    const payload = JSON.parse(json.result.content[0].text);
    const data = payload?.result?.data?.result || {};
    // прошлые значения — последняя записанная дата в логе по каждому запросу
    const prev = {};
    try {
      for (const line of readFileSync(BRAND_LOG, 'utf8').trim().split('\n')) {
        const [, q, base] = line.split('|');
        if (q) prev[q] = parseInt(base, 10); // последняя запись затирает раннюю — это и нужно
      }
    } catch { /* лога ещё нет */ }
    let msg = '<b>Брендовый спрос</b> (Wordstat, Россия/мес)\n';
    for (const q of BRAND_QUERIES) {
      const v = data[q]?.['225'];
      if (!v) { msg += `  ${q}: нет данных\n`; continue; }
      appendFileSync(BRAND_LOG, `${today}|${q}|${v.base}|${v.quoted}\n`);
      const d = prev[q] != null ? v.base - prev[q] : null;
      const delta = d == null ? '' : d === 0 ? ' (=)' : ` (${d > 0 ? '+' : ''}${d})`;
      msg += `  ${q}: ${v.base}${delta}, точных: ${v.quoted}\n`;
    }
    return msg;
  } finally {
    await fetch(`${MCP_BASE}/mcp`, { method: 'DELETE', headers: mcpHeaders(sid), signal: AbortSignal.timeout(5_000) }).catch(() => {});
  }
}

async function checkAidacamp() {
  const client = new Client({ connectionString: CONN });
  await client.connect();
  try {
    const { rows: [dates] } = await client.query(`
      SELECT max(date) as d2,
             (SELECT max(date) FROM seo_positions WHERE searcher='yandex_mobile' AND date < (SELECT max(date) FROM seo_positions WHERE searcher='yandex_mobile')) as d1
      FROM seo_positions WHERE searcher='yandex_mobile'`);
    if (!dates?.d2) return 'aidacamp.ru: нет данных\n';
    const d1 = fmt(new Date(dates.d1)), d2 = fmt(new Date(dates.d2));
    const { rows } = await client.query(`
      SELECT
        count(*) FILTER (WHERE position<=10) AS top10_now,
        count(*) FILTER (WHERE position<=3)  AS top3_now,
        (SELECT count(*) FILTER (WHERE position<=10) FROM seo_positions WHERE searcher='yandex_mobile' AND date=$1) AS top10_prev
      FROM seo_positions WHERE searcher='yandex_mobile' AND date=$2`, [d1, d2]);
    const { rows: ups } = await client.query(`
      SELECT k2.keyword, k1.position AS prev, k2.position AS curr, (k1.position - k2.position) AS delta
      FROM seo_positions k1 JOIN seo_positions k2
        ON k1.keyword=k2.keyword AND k1.searcher=k2.searcher
      WHERE k1.date=$1 AND k2.date=$2 AND k1.searcher='yandex_mobile'
        AND k1.position>k2.position AND k2.position<=20
      ORDER BY delta DESC LIMIT 3`, [d1, d2]);
    const r = rows[0];
    const diff10 = r.top10_now - (r.top10_prev || 0);
    const sign = diff10 >= 0 ? '+' : '';
    let msg = `<b>aidacamp.ru</b> (${d2})\nТОП-10: ${r.top10_now} (${sign}${diff10}) | ТОП-3: ${r.top3_now}\n`;
    ups.forEach(u => { msg += `  ↑${u.delta} <i>${u.keyword}</i> ${u.prev}→${u.curr}\n`; });
    return msg;
  } finally { await client.end(); }
}

async function checkTopvisor(proj) {
  const r = await fetch('https://api.topvisor.com/v2/json/get/positions_2/history/', {
    method: 'POST',
    headers: { 'User-Id': TV_USER, 'Authorization': `bearer ${TV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project_id: proj.id, date1: weekAgo, date2: today,
      fields: ['id', 'name', 'positionsData'],
      positions_fields: ['position'],
      regions_indexes: [33],
    })
  });
  const d = await r.json();
  const keywords = d.result?.keywords || [];
  if (!keywords.length) return `${proj.site}: нет данных\n`;

  let top10 = 0, improved = 0, degraded = 0;
  const ups = [];
  keywords.forEach(kw => {
    const pd = kw.positionsData || {};
    const entries = Object.entries(pd)
      .filter(([k]) => k.endsWith(`:${proj.id}:33`))
      .map(([k, v]) => [k.slice(0, 10), v.position || 100])
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (entries.length < 2) return;
    const prev = entries[0][1], curr = entries[entries.length - 1][1];
    if (curr <= 10) top10++;
    const delta = prev - curr;
    if (delta > 2) { improved++; ups.push({ name: kw.name, prev, curr, delta }); }
    if (delta < -2) degraded++;
  });
  ups.sort((a, b) => b.delta - a.delta);
  const top3 = ups.slice(0, 3).map(u => `  ↑${Math.round(u.delta)} <i>${u.name}</i> ${u.prev}→${u.curr}`).join('\n');
  return `<b>${proj.site}</b>\nТОП-10: ${top10} | ↑${improved} ↓${degraded}\n${top3 ? top3 + '\n' : ''}`;
}

(async () => {
  const dateStr = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  let msg = `📊 <b>SEO-позиции</b> (${dateStr})\n\n`;
  msg += await checkAidacamp().catch(e => `aidacamp.ru: ошибка — ${e.message}\n`);
  msg += '\n';
  for (const proj of [
    { id: 28354270, site: 'codims.ru' },
    { id: 28585795, site: 'icepartners.ru' },
    { id: 29041803, site: 'vlad-a.ru' },
  ]) {
    msg += await checkTopvisor(proj).catch(e => `${proj.site}: ошибка — ${e.message}\n`);
    msg += '\n';
  }
  msg += await checkBrand().catch(e => `Брендовый спрос: ошибка — ${e.message}\n`);
  if (process.env.SWC_NO_TG === '1') {
    console.log(msg); // тихий тестовый прогон без Telegram
  } else {
    await notify(msg, { topic: 'seo', parseMode: 'HTML' });
  }
  console.log('Sent', new Date().toISOString());
})();
