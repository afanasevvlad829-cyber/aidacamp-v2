// seo-backlog-webmaster.mjs — обогащение бэклога реальными запросами из Яндекс.Вебмастера.
//
// Зачем (найдено 20.08.2026): у icepartners в Топвизоре отслеживается 187 ключей и НИ ПО
// ОДНОМУ нет позиции, а в Вебмастере — 881 реальный запрос с показами, и по части из них
// сайт уже в ТОП-10 («вкс мультимедийное проектирование» — поз. 8.1, 37 показов).
// То есть отслеживаемое ядро набрано мимо реального спроса. Вебмастер — единственный
// источник, который показывает, по чему сайт РЕАЛЬНО показывается, а не по чему мы решили,
// что он должен показываться.
//
// Почему показы важнее Wordstat-частотности: Wordstat говорит про спрос в стране вообще,
// а IMPRESSIONS — про спрос, который реально дошёл до этого сайта (с учётом гео, интента
// и того, что Яндекс вообще счёл страницу релевантной). Для приоритета берём именно их.
//
// Идемпотентно: ON CONFLICT обновляет метрики, не плодит дубли. Можно гонять регулярно.
//
// Запуск: node seo-backlog-webmaster.mjs <site> <host_id>
//   node seo-backlog-webmaster.mjs icepartners 'https:icepartners.ru:443'

import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const SITE = process.argv[2];
const HOST_ID = process.argv[3];
if (!SITE || !HOST_ID) {
  console.error("usage: seo-backlog-webmaster.mjs <site> <host_id>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const MCP_BASE = 'http://127.0.0.1:3457';
const PG = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

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
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'seo-backlog-wm', version: '1.0' } },
  });
  if (!init.sid) throw new Error('MCP handshake без session-id');
  await mcpRpc(init.sid, { jsonrpc: '2.0', method: 'notifications/initialized' });
  return init.sid;
}
async function callTool(sid, name, args) {
  const { json } = await mcpRpc(sid, { jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args } });
  if (json?.error || json?.result?.isError)
    throw new Error(json?.error?.message || json.result.content?.[0]?.text?.slice(0, 300) || 'isError');
  return JSON.parse(json.result.content[0].text);
}

// Вебмастер отдаёт по запросу массив statistics: по строке на (дата × поле).
// Сворачиваем: позиция — среднее, показы/клики — сумма за период.
function aggregate(row) {
  const stats = row.statistics || [];
  let posSum = 0, posN = 0, impr = 0, clicks = 0;
  for (const s of stats) {
    const v = Number(s.value);
    if (Number.isNaN(v)) continue;
    if (s.field === 'POSITION') { posSum += v; posN++; }
    else if (s.field === 'IMPRESSIONS') impr += v;
    else if (s.field === 'CLICKS') clicks += v;
  }
  return {
    keyword: row.text_indicator?.value,
    url: row.popular_complementary_indicator?.value || null,
    position: posN ? Math.round((posSum / posN) * 10) / 10 : null,
    impressions: impr,
    clicks,
    ctr: impr ? Math.round((clicks / impr) * 1000) / 10 : 0,
  };
}

const esc = s => String(s).replace(/'/g, "''");

(async () => {
  const sid = await initMcp();
  log(`Вебмастер: ${SITE} (${HOST_ID})`);

  // Одним запросом: MCP-обёртка (/opt/mcp/lib/run/webmaster.mjs) НЕ пробрасывает offset —
  // передаются только limit/order_by/date_from/date_to. Постраничный цикл поэтому
  // бесконечно возвращал одну и ту же первую страницу (поймано 20.08.2026).
  // limit=500 — жёсткий потолок Яндекса («Limit min value is 0, max value is 500»).
  // Вместе с отсутствием offset это значит: берём ТОП-500 по показам. Хвост за пределами
  // 500 — запросы с единичными показами, их ценность близка к нулю; если понадобится
  // полное покрытие — надо добавить offset в /opt/mcp/lib/run/webmaster.mjs.
  const res = await callTool(sid, 'run', {
    service: 'webmaster', action: 'queries',
    params: { host_id: HOST_ID, limit: 500, order_by: 'IMPRESSIONS' },
  });
  const all = res.text_indicator_to_statistics || [];
  log(`  получено ${all.length}${res.count ? ' из ' + res.count : ''}`);
  if (!all.length) { log('запросов нет — выходим'); return; }
  if (res.count && all.length < res.count)
    log(`  ℹ️ взят ТОП-${all.length} по показам из ${res.count} (потолок API, хвост — единичные показы)`);

  const rows = all.map(aggregate).filter(r => r.keyword);
  // ТОП-10 не трогаем (правило владельца) — но в бэклог кладём всё, отметив фронт;
  // выборку кандидатов делает уже сам цикл по status/priority.
  const candidates = rows.filter(r => r.position == null || r.position > 10);
  log(`всего запросов: ${rows.length}, из них не в ТОП-10: ${candidates.length}`);

  // Кластеры: сколько запросов ведут на одну страницу
  const perPage = new Map();
  for (const r of candidates) if (r.url) perPage.set(r.url, (perPage.get(r.url) || 0) + 1);

  const values = candidates.map(r => {
    const cluster = r.url ? perPage.get(r.url) : null;
    const nearness = r.position != null ? Math.max(0, 101 - r.position) / 100 : 0.1;
    // приоритет от ПОКАЗОВ (реальный спрос этого сайта), а не от Wordstat
    const priority = Math.round(r.impressions * nearness * Math.sqrt(cluster || 1) * 100) / 100;
    const q = s => (s == null ? 'NULL' : `'${esc(s)}'`);
    const n = v => (v == null || Number.isNaN(v) ? 'NULL' : v);
    return `('${esc(SITE)}',${q(r.keyword)},${n(r.position != null ? Math.round(r.position) : null)},${q(r.url)},${n(r.impressions)},${n(r.clicks)},${n(r.ctr)},${q(r.url)},${n(cluster)},'A',${n(priority)},'webmaster',CURRENT_DATE)`;
  });

  for (let i = 0; i < values.length; i += 200) {
    const sql = `
INSERT INTO seo_keyword_backlog
  (site, keyword, position, relevant_url, impressions, clicks, ctr, cluster_page, cluster_size, front, priority, source, snapshot_date)
VALUES ${values.slice(i, i + 200).join(',\n')}
ON CONFLICT (site, keyword) DO UPDATE SET
  position=EXCLUDED.position, relevant_url=EXCLUDED.relevant_url,
  impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, ctr=EXCLUDED.ctr,
  cluster_page=EXCLUDED.cluster_page, cluster_size=EXCLUDED.cluster_size,
  priority=EXCLUDED.priority, source=EXCLUDED.source, snapshot_date=EXCLUDED.snapshot_date,
  updated_at=now();`;
    execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: ['ignore', 'ignore', 'inherit'] });
    log(`  записано ${Math.min(i + 200, values.length)}/${values.length}`);
  }

  log('ГОТОВО');
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
