// seo-backlog-build.mjs — ФАЗА 1 конвейера: разовый большой анализ по всем ключам 4 сайтов.
//
// Идея владельца 20.08.2026: «может, одним скопом провести большой анализ по всем ключам,
// а потом потихонечку внедрять». Причина, почему это выгодно: у aidacamp 282 ключа на
// поз.11+ распределены всего по ~39 страницам (≈7 ключей на страницу) — цикл, берущий
// «1 ключ = 1 правка», заходит на одну и ту же страницу семь раз вместо одного раза
// с полной картиной.
//
// ЧТО СЧИТАЕМ ЗДЕСЬ (стабильные данные, живут неделями):
//   - свежие позиции + relevant_url (Топвизор — ЕДИНСТВЕННЫЙ источник позиций);
//   - частотность (Arsenkin wordstat, батчами по 100, кэш 24ч);
//   - кластеры: сколько ключей ведут на одну страницу (cluster_page/cluster_size);
//   - каннибализация: один ключ ранжируется несколькими нашими URL;
//   - приоритет = f(частотность, позиция, размер кластера).
//
// ЧЕГО ЗДЕСЬ НЕТ СОЗНАТЕЛЬНО:
//   - LSI-гипотеза (Arsenkin `sp`) — она протухает вместе с выдачей. Считается ВСЕГДА
//     свежей в момент правки (Шаг E.2 скилла seo-wave-cycle). Инцидент 13.08.2026: правка
//     по грубым/староватым данным ушла в противоположную от нужной сторону.
//   - Mutagen strong — 1 вызов на ключ, дорого для 800+ ключей разом; берётся лениво
//     по конкретному кандидату в момент работы над ним.
//
// ⛔ seo_positions/seo_cluster_progress НЕ ЧИТАЕМ: ETL отключён 14.07.2026, последний
//    снимок 12.06.2026 (см. [[seo-etl-decommissioned]]).
//
// Запуск (долгий, только в фоне + лог — правило проекта):
//   nohup node seo-backlog-build.mjs > /var/log/seo-backlog-build.log 2>&1 &

import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const TV_TOKEN = env.TOPVISOR_TOKEN, TV_USER = env.TOPVISOR_USER_ID;
const MCP_BASE = 'http://127.0.0.1:3457';
const PG = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';

const SITES = [
  { site: 'aidacamp',    project: 11807186 },
  { site: 'codims',      project: 28354270 },
  { site: 'icepartners', project: 28585795 },
  { site: 'vlad-a',      project: 29041803 },
];

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ── Топвизор: свежие позиции (через MCP, НЕ прямым API) ─────────────────────
// ⚠️ Прямой вызов api.topvisor.com с fields:['id','name','positionsData'] отвергается:
// «code 2004: Несоответствие значения переданного параметра fields[n].name =
// 'positionsData'» (проверено 20.08.2026 на всех 4 проектах). MCP-обёртка
// run(service='topvisor', action='positions') строит запрос иначе и работает —
// ходим только через неё. Тем же сломанным прямым вызовом пользуется
// checkTopvisor() в /opt/scripts/seo_weekly_check.mjs — там это тоже не работает.
async function fetchPositions(sid, project) {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);
  const d = await callTool(sid, 'run', {
    service: 'topvisor', action: 'positions',
    params: { project_id: project, date1: from, date2: today },
  });
  if (d.errors) throw new Error('Топвизор: ' + JSON.stringify(d.errors).slice(0, 200));
  const out = [];
  for (const kw of d.result?.keywords || []) {
    const pd = kw.positionsData || {};
    const entries = Object.entries(pd).sort((a, b) => a[0].localeCompare(b[0]));
    if (!entries.length) { out.push({ keyword: kw.name, position: null, url: null, date: null }); continue; }
    const [key, val] = entries[entries.length - 1];
    const pos = parseInt(val.position, 10);
    out.push({
      keyword: kw.name,
      position: Number.isNaN(pos) ? null : pos,
      url: val.relevant_url || null,
      date: key.split(':')[0],
    });
  }
  return out;
}

// ── Arsenkin через MCP: частотность батчами ─────────────────────────────────
function mcpHeaders(sid) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };
  if (env.MCP_SECRET) h.Authorization = `Bearer ${env.MCP_SECRET}`;
  if (sid) h['mcp-session-id'] = sid;
  return h;
}
async function mcpParse(res) {
  const body = await res.text();
  if ((res.headers.get('content-type') || '').includes('text/event-stream')) {
    for (const line of body.split('\n')) if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim());
    throw new Error('SSE без data-фрейма');
  }
  return body ? JSON.parse(body) : null;
}
async function mcpRpc(sid, payload) {
  const res = await fetch(`${MCP_BASE}/mcp`, {
    method: 'POST', headers: mcpHeaders(sid), body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  return { json: await mcpParse(res), sid: res.headers.get('mcp-session-id') || sid };
}
async function initMcp() {
  const init = await mcpRpc(null, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'seo-backlog', version: '1.0' } },
  });
  if (!init.sid) throw new Error('MCP handshake без session-id');
  await mcpRpc(init.sid, { jsonrpc: '2.0', method: 'notifications/initialized' });
  return init.sid;
}
async function callTool(sid, name, args) {
  const { json } = await mcpRpc(sid, { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
  if (json?.error || json?.result?.isError)
    throw new Error(json?.error?.message || json.result.content?.[0]?.text?.slice(0, 200) || 'isError');
  return JSON.parse(json.result.content[0].text);
}
function findKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const f = findKey(v, key); if (f !== undefined) return f; }
  return undefined;
}

// Батч 100 фраз/вызов + пауза — протокол Арсенкина из методики (§5, 429-паузы)
async function fetchVolumes(sid, keywords) {
  const vols = new Map();
  for (let i = 0; i < keywords.length; i += 100) {
    const batch = keywords.slice(i, i + 100);
    try {
      const res = await callTool(sid, 'run', {
        service: 'arsenkin', action: 'run_sync',
        params: { tool: 'wordstat', data: { queries: batch, regions: [213], ws: ['base'], type: 1 } },
      });
      for (const kw of batch) {
        const byRegion = findKey(res, kw);
        const v = byRegion ? Object.values(byRegion)[0] : null;
        if (v && v.base != null) vols.set(kw, parseInt(v.base, 10));
      }
      log(`  частотность: ${Math.min(i + 100, keywords.length)}/${keywords.length}`);
    } catch (e) {
      log(`  ⚠️ батч ${i}-${i + 100} упал: ${e.message.slice(0, 120)}`);
    }
    if (i + 100 < keywords.length) await new Promise(r => setTimeout(r, 15000)); // пауза против 429
  }
  return vols;
}

// ── Запись в Postgres ───────────────────────────────────────────────────────
function upsert(rows) {
  if (!rows.length) return;
  const values = rows.map(r => {
    const q = s => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
    const n = v => (v == null || Number.isNaN(v) ? 'NULL' : v);
    return `(${q(r.site)},${q(r.keyword)},${n(r.position)},${q(r.url)},${n(r.volume)},${q(r.cluster_page)},${n(r.cluster_size)},${r.cannibal},${q(r.front)},${n(r.priority)},${q(r.date)})`;
  }).join(',\n');
  const sql = `
INSERT INTO seo_keyword_backlog
  (site, keyword, position, relevant_url, volume, cluster_page, cluster_size, cannibal, front, priority, snapshot_date)
VALUES ${values}
ON CONFLICT (site, keyword) DO UPDATE SET
  position=EXCLUDED.position, relevant_url=EXCLUDED.relevant_url, volume=EXCLUDED.volume,
  cluster_page=EXCLUDED.cluster_page, cluster_size=EXCLUDED.cluster_size, cannibal=EXCLUDED.cannibal,
  front=EXCLUDED.front, priority=EXCLUDED.priority, snapshot_date=EXCLUDED.snapshot_date,
  updated_at=now();`;
  execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: ['ignore', 'ignore', 'inherit'] });
}

(async () => {
  const sid = await initMcp();
  log('MCP готов');

  for (const { site, project } of SITES) {
    log(`=== ${site} (проект ${project}) ===`);
    let keys;
    try {
      keys = await fetchPositions(sid, project);
    } catch (e) {
      log(`  ✗ позиции не получены: ${e.message}`); continue;
    }
    log(`  ключей в проекте: ${keys.length}`);

    // Кандидаты: НЕ ТОП-10 (правило владельца: топ-10 не трогаем)
    const candidates = keys.filter(k => k.position == null || k.position > 10);
    log(`  кандидатов (не ТОП-10): ${candidates.length}`);
    if (!candidates.length) continue;

    // Частотность — только по кандидатам, батчами
    const vols = await fetchVolumes(sid, candidates.map(k => k.keyword));

    // Кластеры: сколько ключей ведут на одну и ту же страницу
    const perPage = new Map();
    for (const k of candidates) if (k.url) perPage.set(k.url, (perPage.get(k.url) || 0) + 1);

    // Каннибализация: один ключ — несколько наших URL в истории замеров
    // (здесь по последнему снимку видно только один URL; флаг ставим, если одна и та же
    //  фраза встречается в проекте дважды с разными relevant_url — редко, но бывает)
    const urlsByKw = new Map();
    for (const k of keys) {
      if (!k.url) continue;
      const s = urlsByKw.get(k.keyword) || new Set();
      s.add(k.url); urlsByKw.set(k.keyword, s);
    }

    const rows = candidates.map(k => {
      const volume = vols.get(k.keyword) ?? null;
      const cluster_size = k.url ? perPage.get(k.url) : null;
      // фронт: A — есть своя страница и позиция в пределах 100; D — страницы/позиции нет вовсе
      const front = k.position != null && k.position <= 100 && k.url ? 'A' : 'D';
      // приоритет: спрос × близость к ТОП-10 × размер кластера (одна правка закроет N ключей)
      const nearness = k.position != null ? Math.max(0, 101 - k.position) / 100 : 0.1;
      const priority = volume != null
        ? Math.round(volume * nearness * Math.sqrt(cluster_size || 1) * 100) / 100
        : null;
      return {
        site, keyword: k.keyword, position: k.position, url: k.url, volume,
        cluster_page: k.url, cluster_size, cannibal: (urlsByKw.get(k.keyword)?.size || 0) > 1,
        front, priority, date: k.date,
      };
    });

    // писать пачками, чтобы не упереться в длину аргумента psql
    for (let i = 0; i < rows.length; i += 200) upsert(rows.slice(i, i + 200));
    log(`  ✓ записано в бэклог: ${rows.length}`);
  }

  log('ФАЗА 1 ЗАВЕРШЕНА');
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
