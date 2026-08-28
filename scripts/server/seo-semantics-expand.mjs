// seo-semantics-expand.mjs — расширение семантики ОТ СУЩЕСТВУЮЩИХ СТРАНИЦ.
//
// Зачем. Владелец 27.08.2026: «если ключей нет — смотри по тематике сайта,
// предлагай релевантные ключи, даже если сайта в топе нет». У icepartners и
// vlad-a очередь состоит из ключей без позиции и без страницы — дожимать
// нечего, конвейер простаивает.
//
// Почему «от страницы», а не абстрактно по теме. Замер 125 волн (25.08) показал:
// работает дожим существующих страниц (78% волн лучше фона у codims, 72% в зоне
// 11-15). Абстрактный сбор «всё про СКУД» даст сотни запросов, под которые нет
// страниц, — то есть снова очередь из пустышек. Поэтому seed берём из ключей,
// которые УЖЕ привязаны к странице, и расширение сразу ложится на неё же.
//
// Источник — Wordstat suggest (`results`). Ассоциации (`associations`) НЕ берём:
// проверено 27.08.2026 на «скуд для офиса» — там «офисные столы», «office 2024»
// и прочий несвязанный мусор.
//
// Запуск:
//   node seo-semantics-expand.mjs <site> [--limit N] [--min-volume N] [--dry]
import { execFileSync } from 'node:child_process';

const PG = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const SITE = process.argv[2];
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const DRY = process.argv.includes('--dry');
const SEEDS_LIMIT = arg('--limit', 12);
const MIN_VOLUME = arg('--min-volume', 30);

if (!SITE) { console.error('нужен site: aidacamp|codims|icepartners|vlad-a'); process.exit(1); }
const log = m => console.log(`${new Date().toTimeString().slice(0, 8)} ${m}`);
const sql = q => execFileSync('psql', [PG, '-tAF\t', '-c', q], { encoding: 'utf8' }).trim();
const esc = s => String(s).replace(/'/g, "''");

// Бренды конкурентов и вендоров. Продвигаться по чужому бренду бессмысленно:
// по «скуд болид» ищут конкретного производителя, а не интегратора. Список
// пополняется по мере появления в выдаче.
// Бренды конкурентов и вендоров. Продвигаться по чужому бренду бессмысленно:
// по «скуд болид» ищут конкретного производителя, а не интегратора.
// ⚠️ Проверяем ПОСЛОВНО, а не регуляркой с \b: в JavaScript граница слова не
// работает с кириллицей без особых плясок, и «скуд болид» спокойно проходил
// сквозь /\bболид\b/i (поймано на первом прогоне 27.08.2026).
const BRANDS = new Set(['болид','bolid','рубеж','sigur','сигур','perco','перко','парсек','parsec','ironlogic','айрон','gate','эра','hikvision','hik','dahua','axis','ubiquiti','mikrotik','zkteco','honeywell','bosch','3cx','asterisk','астериск','avaya','cisco','yealink','grandstream','sigma','tantos','beward']);

// Служебные и вопросительные слова: фраза, начинающаяся или кончающаяся ими, —
// осколок словоформы, а не запрос («ли скуд», «скуд какие»).
const STOP = new Set(['ли','и','или','а','но','в','во','на','по','для','с','со','от','до','за','под','при','о','об','что','как','это','его','их','не','какие','какой','какая','какое','где','когда','чем','кто','этот','эта']);

// Мусор, который Wordstat отдаёт как «вложенные», но пользы в нём нет.
function isJunk(p) {
  if (!p || p.length > 100) return true;
  if (/https?:\/\/|[a-z0-9-]+\.(ru|com|net|org)(\s|$)/i.test(p)) return true;
  if (/(порно|секс|скачать бесплатно|торрент|крякнут|взлом)/i.test(p)) return true;
  const words = p.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;                        // одно слово — слишком широко
  if (words.some(w => BRANDS.has(w))) return true;          // чужой бренд
  if (/^\d+$/.test(words[words.length - 1])) return true;    // «скуд 1», «скуду 2»
  if (STOP.has(words[0]) || STOP.has(words[words.length - 1])) return true;
  return false;
}

const mcp = (service, action, params) => {
  const out = execFileSync('/opt/scripts/mcp-call.sh', [service, action, JSON.stringify(params)], { encoding: 'utf8', timeout: 120_000 });
  return JSON.parse(out);
};

(async () => {
  // seed-фразы: лучшие ключи, уже привязанные к странице сайта
  // ⚠️ Порядок и выбор seed решают всё (поймано на первом прогоне 27.08.2026).
  // Наивный `ORDER BY relevant_url` брал страницы по алфавиту — начинал с /blog
  // и подсовывал длинные вопросы вроде «техническое задание на закупку astra l».
  // У таких фраз вложенных запросов нет вовсе, результат — ноль кандидатов.
  // Теперь: страницы по суммарному спросу (важные первыми), а seed внутри
  // страницы — короткая частотная фраза (до 4 слов): именно у общих фраз есть
  // хвост вложенных запросов, ради которого всё и затевается.
  const rows = sql(`
    WITH pages AS (
      SELECT relevant_url, SUM(COALESCE(volume,0)) AS demand
        FROM seo_keyword_backlog
       WHERE site = '${esc(SITE)}' AND relevant_url IS NOT NULL
       GROUP BY relevant_url
       ORDER BY demand DESC
       LIMIT ${SEEDS_LIMIT}
    )
    SELECT DISTINCT ON (b.relevant_url) b.relevant_url, b.keyword, COALESCE(b.volume,0)
      FROM seo_keyword_backlog b
      JOIN pages p ON p.relevant_url = b.relevant_url
     WHERE b.site = '${esc(SITE)}' AND b.keyword IS NOT NULL
       AND array_length(regexp_split_to_array(b.keyword, '\\s+'), 1) <= 4
     ORDER BY b.relevant_url, COALESCE(b.volume,0) DESC`)
    .split('\n').filter(Boolean)
    .map(l => { const [url, keyword, volume] = l.split('\t'); return { url, keyword, volume: Number(volume) }; });

  if (!rows.length) { log(`у ${SITE} нет ключей с привязкой к странице — расширять не от чего`); return; }
  log(`seed-фраз: ${rows.length} (по одной на страницу)`);

  const existing = new Set(
    sql(`SELECT lower(keyword) FROM seo_keyword_backlog WHERE site='${esc(SITE)}'`).split('\n').filter(Boolean)
  );

  let found = 0, added = 0;
  for (const seed of rows) {
    let res;
    try {
      res = mcp('wordstat', 'suggest', { phrase: seed.keyword, region: 213 });
    } catch (e) {
      log(`  ✖ ${seed.keyword.slice(0, 40)}: ${String(e.message).slice(0, 60)}`);
      continue;
    }
    const cand = (res.results || [])
      .map(r => ({ phrase: String(r.phrase || '').trim().toLowerCase(), count: Number(r.count || 0) }))
      .filter(r => r.phrase && r.count >= MIN_VOLUME && !isJunk(r.phrase) && !existing.has(r.phrase));

    found += cand.length;
    for (const c of cand) {
      existing.add(c.phrase);
      const intent = /куп|цена|стоимость|заказ|установ|монтаж|под ключ|услуг/.test(c.phrase) ? 'commercial'
                   : /как |что такое|почему|зачем|инструкц/.test(c.phrase) ? 'info' : 'mixed';
      // priority без позиции: спрос × коммерческий вес. Позиции нет — страница по
      // запросу ещё не ранжируется, это кандидат на дожим той же страницы.
      const priority = Math.round(c.count * (intent === 'commercial' ? 1.5 : intent === 'info' ? 0.3 : 1.0) * 100) / 100;
      // Коммерческий запрос, найденный от статьи, вешать на статью нельзя: «скуд
      // купить» с блога не продаст. Оставляем без привязки — конвейер подберёт
      // посадочную сам, а если её нет, ключ станет кандидатом на новую страницу
      // (фронт D, через подтверждение владельца).
      const isBlogSeed = /\/blog\/|\/stati\//.test(seed.url);
      const url = (intent === 'commercial' && isBlogSeed) ? null : seed.url;
      if (DRY) { console.log(`    + ${c.count.toString().padStart(5)}  ${intent.padEnd(10)} ${c.phrase}  → ${url || '(нужна посадочная)'}`); added++; continue; }
      const urlSql = url ? `'${esc(url)}'` : 'NULL';
      sql(`INSERT INTO seo_keyword_backlog (site, keyword, volume, relevant_url, cluster_page, intent, front, priority, source, status, snapshot_date)
           VALUES ('${esc(SITE)}','${esc(c.phrase)}',${c.count},${urlSql},${urlSql},'${intent}','${url ? 'A' : 'D'}',${priority},'suggest','new',CURRENT_DATE)
           ON CONFLICT (site, keyword) DO NOTHING`);
      added++;
    }
    log(`  ${seed.url}: +${cand.length} (seed «${seed.keyword.slice(0, 38)}»)`);
  }

  log(`ГОТОВО: найдено ${found}, ${DRY ? 'показано (dry)' : 'добавлено'} ${added}`);
  if (!DRY && added > 0) {
    try {
      execFileSync('/opt/scripts/seo-alert.sh',
        ['info', 'semantics', `${SITE}: очередь пополнена на ${added} ключей`],
        { input: `Источник: Wordstat suggest от существующих страниц, порог частотности ${MIN_VOLUME}.` });
    } catch {}
  }
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
