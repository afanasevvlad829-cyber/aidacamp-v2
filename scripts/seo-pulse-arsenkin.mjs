// seo-pulse-arsenkin.mjs — дневной ротационный чек конкурентов + частотности
// через MCP-обёртку Арсенкина (тот же локальный MCP на 127.0.0.1:3457, что
// использует seo_weekly_check.mjs — правило [[feedback-no-raw-arsenkin-scripts]]:
// не ходить к arsenkin.ru напрямую, только через очередь MCP).
//
// Берёт ОДНУ фразу в день по ротации (список — seo-pulse-keywords.txt, правь
// его руками под текущую волну конвейера), снимает:
//   - ТОП-10 Яндекса (top_export, регион 213 — Москва) → домены
//   - частотность (wordstat, кэш 24ч)
// и сравнивает домены с прошлым снятием ТОЙ ЖЕ фразы (история — JSON рядом
// со скриптом на сервере) — новый домен в ТОП-10 подсвечивается в отчёте.
//
// Вывод — ОДНА строка в stdout, поля через \x1F (Unit Separator, НЕ таб —
// таб/пробел в bash IFS схлопывают подряд идущие пустые поля, что теряет
// пустую частотность): keyword\x1Fbase\x1Fquoted\x1Ftop10(|)\x1FnewEntrants(|)\x1FprevDate
//
// Запуск: node seo-pulse-arsenkin.mjs <keywords.txt> [history.json]

import { readFileSync, existsSync, writeFileSync } from 'fs';

const KEYWORDS_FILE = process.argv[2];
const HISTORY_FILE = process.argv[3] || '/opt/scripts/seo-pulse-arsenkin-history.json';
if (!KEYWORDS_FILE) { console.error('usage: seo-pulse-arsenkin.mjs <keywords.txt> [history.json]'); process.exit(1); }

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const MCP_BASE = 'http://127.0.0.1:3457';

const KEYWORDS = readFileSync(KEYWORDS_FILE, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
if (!KEYWORDS.length) { console.error('пустой список ключей: ' + KEYWORDS_FILE); process.exit(1); }
const dayIdx = Math.floor(Date.now() / 86400000) % KEYWORDS.length;
const keyword = KEYWORDS[dayIdx];

function mcpHeaders(sessionId) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (env.MCP_SECRET) h.Authorization = `Bearer ${env.MCP_SECRET}`;
  if (sessionId) h['mcp-session-id'] = sessionId;
  return h;
}
async function mcpParse(res) {
  const body = await res.text();
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) {
    for (const line of body.split('\n'))
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    throw new Error('SSE без data-фрейма');
  }
  return body ? JSON.parse(body) : null;
}
async function mcpRpc(sessionId, payload) {
  const res = await fetch(`${MCP_BASE}/mcp`, {
    method: 'POST', headers: mcpHeaders(sessionId), body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  return { json: await mcpParse(res), sessionId: res.headers.get('mcp-session-id') || sessionId };
}
async function initSession() {
  const init = await mcpRpc(null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'seo-pulse-arsenkin', version: '1.0' } },
  });
  const sid = init.sessionId;
  if (!sid || init.json?.error) throw new Error('MCP handshake: ' + (init.json?.error?.message || 'нет session-id'));
  await mcpRpc(sid, { jsonrpc: '2.0', method: 'notifications/initialized' });
  return sid;
}
async function callTool(sid, name, args) {
  const { json } = await mcpRpc(sid, { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
  if (json?.error || json?.result?.isError)
    throw new Error(json?.error?.message || json.result.content?.[0]?.text?.slice(0, 200) || 'isError');
  return JSON.parse(json.result.content[0].text);
}
async function waitArsenkinTask(sid, taskId, timeoutMs = 100_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const r = await callTool(sid, 'run', { service: 'arsenkin', action: 'get', params: { task_id: taskId } });
    if (r.status === 'done') return r;
    if (r.status === 'error') throw new Error('arsenkin task error: ' + JSON.stringify(r).slice(0, 200));
    await new Promise(res => setTimeout(res, 5000));
  }
  throw new Error('arsenkin task timeout');
}
// Ответ Арсенкина вложен неравномерно (result.result.result.collect и т.п.) —
// ищем ключ рекурсивно, чтобы не зависеть от точной глубины вложенности.
function findKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const found = findKey(v, key);
    if (found !== undefined) return found;
  }
  return undefined;
}

(async () => {
  const sid = await initSession();

  // ТОП-10 (Яндекс, регион 213 — Москва)
  let top10 = [];
  const topStart = await callTool(sid, 'run', {
    service: 'arsenkin', action: 'top_export',
    params: { queries: [keyword], se: [{ type: 1, region: 213 }], depth: 10 },
  });
  if (topStart.task_id) {
    const done = await waitArsenkinTask(sid, topStart.task_id);
    const collect = findKey(done, 'collect');
    const urls = collect?.[0]?.[0] || [];
    top10 = urls.map(u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } });
  }

  // Частотность (кэш 24ч) — необязательна, отчёт не должен падать без неё
  let base = '', quoted = '';
  try {
    const wsRes = await callTool(sid, 'run', {
      service: 'arsenkin', action: 'run_sync',
      params: { tool: 'wordstat', data: { queries: [keyword], regions: [213], ws: ['base', 'quoted'], type: 1 } },
    });
    // Ответ вложен по региону: result.data.result[keyword][region] = {base,quoted}
    const byRegion = findKey(wsRes, keyword) || {};
    const wd = Object.values(byRegion)[0] || {};
    base = wd.base ?? ''; quoted = wd.quoted ?? '';
  } catch { /* частотность необязательна для отчёта */ }

  // История для сравнения доменов ТОП-10 день-к-дню
  let history = {};
  if (existsSync(HISTORY_FILE)) {
    try { history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8')); } catch { /* повреждён — начнём заново */ }
  }
  const prev = history[keyword];
  const newEntrants = prev ? top10.filter(d => !prev.domains.includes(d)) : [];
  history[keyword] = { date: new Date().toISOString().slice(0, 10), domains: top10 };
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));

  console.log([keyword, base, quoted, top10.join('|'), newEntrants.join('|'), prev?.date || ''].join('\x1F'));
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
