// seo-backlog-volumes.mjs — добор частотности в seo_keyword_backlog (докатывает фазу 1).
//
// Зачем отдельно от seo-backlog-build.mjs: частотность — единственный шаг, который упирается
// в лимиты Арсенкина (429). Позиции/кластеры собираются за секунды, а волюмы надо лить
// медленно и с ретраями, поэтому это отдельный идемпотентный проход: берёт только строки
// с volume IS NULL и может запускаться сколько угодно раз, пока не доберёт всё.
//
// Грабли, из-за которых первый прогон 20.08.2026 собрал 391 из 1269:
//   1. ДВА экземпляра build-скрипта работали одновременно (первый стартовал незаметно) —
//      удвоенный темп мгновенно словил 429. Отсюда флок ниже: два прогона разом запрещены.
//   2. Пауза 15с между батчами оказалась мала — здесь 30с + экспоненциальный бэкофф.
//   3. HTTP 422 роняет ВЕСЬ батч из-за одной кривой фразы («с# язык» — Арсенкин не принимает
//      её синтаксис). Лечится делением батча пополам, пока не выделится виноватая фраза;
//      она помечается volume=-1 (=«частотность недоступна»), чтобы не пытаться вечно.
//
// Запуск (долгий → только фон + лог):
//   nohup node seo-backlog-volumes.mjs > /var/log/seo-backlog-volumes.log 2>&1 &

import { readFileSync, openSync, closeSync } from 'fs';
import { execFileSync } from 'child_process';

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const MCP_BASE = 'http://127.0.0.1:3457';
const PG = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const BATCH = 100;
const PAUSE_MS = 30_000;

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// флок: второй одновременный прогон = гарантированный 429 (грабля №1)
const LOCK = '/tmp/seo-backlog-volumes.lock';
let lockFd;
try {
  lockFd = openSync(LOCK, 'wx');
} catch {
  console.error(`Уже выполняется (есть ${LOCK}). Если это остаток от упавшего прогона — удали файл вручную.`);
  process.exit(1);
}
const releaseLock = () => { try { closeSync(lockFd); execFileSync('rm', ['-f', LOCK]); } catch {} };
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(1); });
process.on('SIGTERM', () => { releaseLock(); process.exit(1); });

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
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'seo-backlog-vol', version: '1.0' } },
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
function findKey(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) { const f = findKey(v, key); if (f !== undefined) return f; }
  return undefined;
}

const sql = q => execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-tAc', q]).toString().trim();
const esc = s => String(s).replace(/'/g, "''");

// один батч: возвращает Map<keyword, volume>; кидает {rate:true} на 429 и {bad:true} на 422
async function askVolumes(sid, keywords) {
  try {
    const res = await callTool(sid, 'run', {
      service: 'arsenkin', action: 'run_sync',
      params: { tool: 'wordstat', data: { queries: keywords, regions: [213], ws: ['base'], type: 1 } },
    });
    const out = new Map();
    for (const kw of keywords) {
      const byRegion = findKey(res, kw);
      const v = byRegion ? Object.values(byRegion)[0] : null;
      if (v && v.base != null) out.set(kw, parseInt(v.base, 10));
    }
    return out;
  } catch (e) {
    const msg = e.message || '';
    if (msg.includes('429')) { const err = new Error('rate'); err.rate = true; throw err; }
    if (msg.includes('422') || msg.includes('JSON_VALIDATION_ERROR')) { const err = new Error('bad'); err.bad = true; throw err; }
    throw e;
  }
}

// 422 = где-то одна кривая фраза: делим пополам, пока не изолируем виноватую
async function askWithSplit(sid, keywords, depth = 0) {
  try {
    return await askVolumes(sid, keywords);
  } catch (e) {
    if (!e.bad) throw e;
    if (keywords.length === 1) {
      log(`    ✗ фраза не принимается Арсенкином, помечаю недоступной: «${keywords[0]}»`);
      sql(`UPDATE seo_keyword_backlog SET volume=-1, updated_at=now() WHERE keyword='${esc(keywords[0])}' AND volume IS NULL`);
      return new Map();
    }
    const mid = Math.ceil(keywords.length / 2);
    log(`    ↔ 422, делю батч ${keywords.length} → ${mid}+${keywords.length - mid}`);
    const a = await askWithSplit(sid, keywords.slice(0, mid), depth + 1);
    await sleep(5000);
    const b = await askWithSplit(sid, keywords.slice(mid), depth + 1);
    return new Map([...a, ...b]);
  }
}

(async () => {
  const sid = await initMcp();
  const rows = sql(`SELECT site || E'\\t' || keyword FROM seo_keyword_backlog WHERE volume IS NULL ORDER BY site, keyword`)
    .split('\n').filter(Boolean).map(l => { const [site, ...k] = l.split('\t'); return { site, keyword: k.join('\t') }; });
  log(`без частотности: ${rows.length}`);
  if (!rows.length) { log('нечего добирать'); return; }

  let done = 0, failed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const kws = chunk.map(r => r.keyword);
    let vols = null;
    for (let attempt = 1; attempt <= 4 && !vols; attempt++) {
      try {
        vols = await askWithSplit(sid, kws);
      } catch (e) {
        if (e.rate) {
          const wait = PAUSE_MS * attempt;           // экспоненциальный бэкофф на 429
          log(`  429, жду ${wait / 1000}с (попытка ${attempt}/4)`);
          await sleep(wait);
        } else {
          log(`  ✗ батч ${i}: ${String(e.message).slice(0, 120)}`);
          break;
        }
      }
    }
    if (!vols) { failed += chunk.length; }
    else {
      const updates = [...vols.entries()].map(([kw, v]) =>
        `UPDATE seo_keyword_backlog SET volume=${v}, updated_at=now() WHERE keyword='${esc(kw)}' AND volume IS NULL;`).join('\n');
      if (updates) execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-c', updates], { stdio: ['ignore', 'ignore', 'inherit'] });
      done += vols.size;
    }
    log(`  прогресс: ${Math.min(i + BATCH, rows.length)}/${rows.length} (записано ${done}, без ответа ${failed})`);
    if (i + BATCH < rows.length) await sleep(PAUSE_MS);
  }

  // Разметка интента для строк, где её ещё нет (новые ключи из build/webmaster-скриптов).
  // Осторожно с трактовкой: в нишах aidacamp/codims сам предмет («лагерь», «курсы») уже
  // коммерческий, поэтому большинство ключей там попадёт в 'mixed' — это НЕ «некоммерческий».
  // Поэтому цикл фильтрует не «только commercial», а «в кластере есть хотя бы один commercial».
  execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-c', `
    UPDATE seo_keyword_backlog SET intent = CASE
      WHEN keyword ~ '(цен|стоимост|купить|заказать|под ключ|монтаж|установк|услуг|проектирован|внедрен|подключ|обслуживан|аутсорс|интегратор|прайс|смет|заказ|сколько стоит|недорого|дешев)' THEN 'commercial'
      WHEN keyword ~ '(что такое|как |почему|чем отлич|отличи|сравнен|или |vs|своими руками|инструкц|схема|принцип работы|виды |какой |зачем)' THEN 'info'
      ELSE 'mixed' END
    WHERE intent IS NULL;`], { stdio: ['ignore', 'ignore', 'inherit'] });

  // Пересчёт приоритета. ЕДИНАЯ формула — держать синхронно со скиллом seo-wave-cycle:
  //   спрос × близость к ТОП-10 × √размер_кластера × множитель интента.
  // Спрос = показы Вебмастера, если есть, иначе Wordstat-частотность (показы честнее:
  // это спрос, реально дошедший до ЭТОГО сайта, а не по стране вообще).
  // Множитель интента — требование владельца 20.08.2026 «фокусируйся на коммерческие»:
  // commercial ×1.5, info ×0.3. ⚠️ Раньше здесь была формула БЕЗ интента и без impressions —
  // она затирала коммерческий фокус при каждом прогоне добора.
  execFileSync('psql', [PG, '-v', 'ON_ERROR_STOP=1', '-c', `
    UPDATE seo_keyword_backlog SET priority = ROUND((
        COALESCE(NULLIF(impressions,0), NULLIF(volume,0), 0)
      * (GREATEST(0, 101 - COALESCE(position, 101)) / 100.0)
      * SQRT(GREATEST(COALESCE(cluster_size,1), 1))
      * CASE intent WHEN 'commercial' THEN 1.5 WHEN 'info' THEN 0.3 ELSE 1.0 END
    )::numeric, 2);`], { stdio: ['ignore', 'ignore', 'inherit'] });

  log(`ГОТОВО: добрано ${done}, без ответа ${failed}`);
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
