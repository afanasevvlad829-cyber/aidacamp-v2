// seo-pulse-justmagic.mjs — второй источник LSI-гипотезы (Just Magic), для сравнения с Арсенкином.
// Задачи Just Magic не мгновенные (минуты), поэтому — двухфазная схема без блокирующего ожидания:
//   сегодня забираем результат ВЧЕРАШНЕЙ задачи (если готова) и сразу ставим НОВУЮ на сегодня.
// Формат API — реально проверено 19.08.2026: документация (just-magic.org/info/api.php) заявляет
// JSON POST, это НЕ работает («action_err» на любой action). Реально нужен form-urlencoded POST
// на https://api.just-magic.org/api_v1.php. Результат — НЕ в mode=info (там только метаданные),
// а в mode=csv (gzip, текст, разделитель — таб).
//
// Ротация — pages-файл (keyword<TAB>url), тот же принцип, что и seo-pulse-arsenkin.mjs.
// Состояние (какая задача ещё не собрана) — JSON рядом со скриптом на сервере.
//
// Вывод — одна строка в stdout, поля через \x1F:
//   вчерашний_keyword \x1F вчерашний_url \x1F diff_summary(;) \x1F сегодняшний_keyword \x1F submit_status
// diff_summary — список "форма_ключа:diff.body" через ";", отрицательное = отстаём от ТОП-10.
//
// Запуск: node seo-pulse-justmagic.mjs <pages.txt> [state.json]

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { execFileSync } from 'child_process';

const PAGES_FILE = process.argv[2];
const STATE_FILE = process.argv[3] || '/opt/scripts/seo-pulse-justmagic-state.json';
if (!PAGES_FILE) { console.error('usage: seo-pulse-justmagic.mjs <pages.txt> [state.json]'); process.exit(1); }

const env = Object.fromEntries(
  readFileSync('/opt/mcp/.env', 'utf8').split('\n')
    .filter(l => l.includes('=')).map(l => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()])
);
const APIKEY = env.JUSTMAGIC_APIKEY;
const API = 'https://api.just-magic.org/api_v1.php';

const PAGES = readFileSync(PAGES_FILE, 'utf8').split('\n').map(l => l.trim()).filter(Boolean)
  .map(l => { const [keyword, url] = l.split('\t'); return { keyword, url }; });
if (!PAGES.length) { console.error('пустой pages-файл: ' + PAGES_FILE); process.exit(1); }

async function jmCall(params) {
  const body = new URLSearchParams({ apikey: APIKEY, ...params });
  const res = await fetch(API, { method: 'POST', body, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`Just Magic HTTP ${res.status}`);
  return res.json();
}

// mode=csv отдаёт gzip — забираем как buffer через curl (fetch+response.body в этой node-версии
// не гарантированно даёт бинарный buffer стабильно с --max-old-space; curl проще и надёжнее здесь)
function fetchCsv(tid) {
  const out = execFileSync('curl', [
    '-sS', '-m', '30', '-X', 'POST', API,
    '--data-urlencode', `action=get_task`,
    '--data-urlencode', `apikey=${APIKEY}`,
    '--data-urlencode', `tid=${tid}`,
    '--data-urlencode', 'mode=csv',
    '--data-urlencode', 'system=unix',
  ]);
  return execFileSync('gunzip', [], { input: out }).toString('utf8');
}

function parseDiffSummary(csv) {
  const lines = csv.split('\n');
  const rows = [];
  for (const line of lines) {
    const cols = line.split('\t');
    // строка формы ключа: 16 колонок, первая — не пустая и не заголовок/мета
    if (cols.length < 12) continue;
    const phrase = cols[0].trim();
    if (!phrase || /^(Meta|Key in work|Всего слов|фразы)/.test(phrase)) continue;
    const diffBody = parseFloat(cols[7]);
    if (Number.isNaN(diffBody)) continue;
    rows.push({ phrase, diffBody });
  }
  return rows;
}

(async () => {
  let state = { pending: null };
  if (existsSync(STATE_FILE)) {
    try { state = JSON.parse(readFileSync(STATE_FILE, 'utf8')); } catch { /* повреждён — начнём заново */ }
  }

  let prevKeyword = '', prevUrl = '', diffSummary = '';
  if (state.pending) {
    const status = await jmCall({ action: 'get_task', tid: state.pending.tid, mode: 'info' }).catch(() => null);
    const st = status?.result?.state;
    if (st === 'fin') {
      try {
        const csv = fetchCsv(state.pending.tid);
        const rows = parseDiffSummary(csv);
        diffSummary = rows.map(r => `${r.phrase}:${r.diffBody}`).join(';');
        prevKeyword = state.pending.keyword; prevUrl = state.pending.url;
      } catch { /* не удалось собрать csv — просто не покажем вчерашний результат */ }
      state.pending = null;
    } else if (st === 'work') {
      prevKeyword = state.pending.keyword; prevUrl = state.pending.url;
      diffSummary = ''; // ещё не готово — покажем как "в работе" через submitStatus ниже
    }
  }

  // Ставим НОВУЮ задачу на сегодня, только если предыдущая уже собрана (не копим очередь)
  let submitStatus = 'skip: предыдущая ещё в работе';
  if (!state.pending) {
    const dayIdx = Math.floor(Date.now() / 86400000) % PAGES.length;
    const { keyword, url } = PAGES[dayIdx];
    try {
      const r = await jmCall({
        action: 'put_task', task: 'txt_anlz', label: `seo-pulse-${dayIdx}`,
        search_engine: 'yandex', ya_lr: '213', data: `${url}\t${keyword}\n`,
      });
      if (r.err === 0) {
        state.pending = { tid: r.tid, keyword, url, submitted_at: new Date().toISOString() };
        submitStatus = `ok: tid=${r.tid}`;
      } else {
        submitStatus = `error: ${r.errtxt}`;
      }
    } catch (e) { submitStatus = `error: ${e.message}`; }
  }

  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log([prevKeyword, prevUrl, diffSummary, state.pending?.keyword || '', submitStatus].join('\x1F'));
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
