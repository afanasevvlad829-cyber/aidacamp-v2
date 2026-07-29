#!/usr/bin/env node
/**
 * SEO Factory — ежедневный автопилот
 * Запуск: node seo-factory.js [--dry-run] [--max-pages=N]
 *
 * Что делает:
 * 1. Находит кластеры запросов без страниц (из seo_keywords)
 * 2. Генерирует Astro-файлы по шаблонам
 * 3. Коммитит + пушит в agent/seo-factory-YYYY-MM-DD
 * 4. Создаёт PR в dev
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Client } = require('pg');

// ── CONFIG ────────────────────────────────────────────────────
const REPO_DIR   = process.env.SEO_REPO_DIR || '/opt/aidacamp-site';  // корень репо (env для прода)
const PAGES_DIR  = path.join(REPO_DIR, 'src/pages');
const TMPL_DIR   = path.join(__dirname, 'templates');
const LOG_FILE   = '/var/log/seo-factory.log';

const DRY_RUN    = process.argv.includes('--dry-run');
const MAX_PAGES  = parseInt((process.argv.find(a => a.startsWith('--max-pages=')) || '--max-pages=15').split('=')[1]);
const TODAY      = new Date().toISOString().slice(0, 10);
const BRANCH     = `agent/seo-factory-${TODAY}`;

// Города Подмосковья для которых уже есть страницы — не создавать повторно
const EXISTING_GEO_SLUGS = new Set([
  'lager-himki','lager-odintsovo','lager-zelenograd','lager-krasnogorsk',
  'lager-vidnoe','lager-balashiha','lager-reutov','lager-pushkino',
  'lager-lyubertsy','lager-korolev','lager-chekhov','lager-domodedovo',
  'lager-stupino','lager-schelkovo','lager-serpuhov','lager-klin',
  'lager-ramenskoe','lager-zhukovskiy','lager-istra','lager-bronnitsy',
  'lager-naro-fominsk',
]);

// ── LOGGING ───────────────────────────────────────────────────
function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').slice(0,19);
  const line = `${ts} — ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + '\n'); } catch {}
}

// ── DB ────────────────────────────────────────────────────────
function getDbClient() {
  const envFile = fs.readFileSync('/opt/aidacamp-tools/mcp/.env', 'utf8');
  const connStr = envFile.match(/DATABASE_URL=(.+)/)?.[1]?.trim()
    || envFile.match(/POSTGRES_URL=(.+)/)?.[1]?.trim()
    || 'postgresql://localhost/aidacamp';
  return new Client({ connectionString: connStr });
}

// ── CLUSTER QUERY ─────────────────────────────────────────────
async function getClusters(client, maxClusters) {
  // Запросы вне ТОП-100, есть частота, нет позиции
  const { rows } = await client.query(`
    SELECT k.keyword, k.frequency_exact, k.frequency_wide, k.url
    FROM seo_keywords k
    LEFT JOIN seo_positions p
      ON p.keyword = k.keyword
      AND p.searcher = 'yandex_mobile'
      AND p.date = (SELECT MAX(date) FROM seo_positions)
    WHERE p.position IS NULL
      AND k.search_engine = 'yandex'
      AND k.region        = 'moscow'
      AND k.is_noise      = false
      AND k.frequency_exact >= 10
      AND k.frequency_exact <= 500
    ORDER BY k.frequency_exact DESC
    LIMIT 500
  `);

  // Кластеризация: группируем по первым двум словам
  const clusters = new Map();
  for (const row of rows) {
    const words = row.keyword.trim().split(/\s+/);
    // Ключ кластера — первые 2 слова (или 1 если слово одно)
    const clusterKey = words.slice(0, 2).join(' ');
    if (!clusters.has(clusterKey)) {
      clusters.set(clusterKey, { keywords: [], mainKeyword: row.keyword, maxFreq: row.frequency_exact });
    }
    const cl = clusters.get(clusterKey);
    if (row.frequency_exact > cl.maxFreq) {
      cl.maxFreq = row.frequency_exact;
      cl.mainKeyword = row.keyword;
    }
    cl.keywords.push(row.keyword);
  }

  // Оставляем кластеры с 2+ запросами или высокой частотой
  const result = [];
  for (const [key, cl] of clusters) {
    if (cl.keywords.length >= 2 || cl.maxFreq >= 50) {
      result.push({ clusterKey: key, ...cl });
    }
    if (result.length >= maxClusters) break;
  }

  return result.sort((a, b) => b.maxFreq - a.maxFreq);
}

// ── RAG ENRICHMENT (замыкание петли) ──────────────────────────
// Перед генерацией страницы тянем из knowledge_chunks накопленную
// экспертизу: LSI-слова, структурные правила, anti-patterns.
const OPENAI_KEY = (() => {
  try {
    const env = fs.readFileSync('/opt/aidacamp-tools/mcp/.env', 'utf8');
    return env.match(/OPENAI_API_KEY=(.+)/)?.[1]?.trim() || '';
  } catch { return ''; }
})();

async function embedQuery(text) {
  if (!OPENAI_KEY) return null;
  try {
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: [text], model: 'text-embedding-3-small' }),
    });
    const d = await resp.json();
    return d?.data?.[0]?.embedding || null;
  } catch { return null; }
}

/**
 * Тянет релевантную экспертизу из RAG для кластера.
 * Возвращает { insights: [тексты], lsiWords: [слова] }
 */
async function enrichFromRAG(client, cluster) {
  const out = { insights: [], lsiWords: [] };
  const query = `${cluster.mainKeyword} LSI слова структура title правила SEO`;

  // 1. Семантический поиск по экспертизе
  const emb = await embedQuery(query);
  if (emb) {
    const vecStr = `[${emb.join(',')}]`;
    try {
      const { rows } = await client.query(`
        SELECT text, 1 - (embedding <=> $1::vector) AS rank
        FROM knowledge_chunks
        WHERE embedding IS NOT NULL
          AND (source LIKE 'seo:expertise:%' OR source LIKE 'report:seo:%')
          AND (1 - (embedding <=> $1::vector)) > 0.35
        ORDER BY rank DESC
        LIMIT 5
      `, [vecStr]);
      out.insights = rows.map(r => r.text);
    } catch (e) { log(`  ⚠️  RAG semantic fail: ${e.message.slice(0,60)}`); }
  }

  // 2. Извлекаем LSI-слова из найденной экспертизы (из инсайта про обязательные LSI)
  const lsiInsight = out.insights.find(t => /LSI|путёвка|программа|вожат/i.test(t));
  if (lsiInsight) {
    const candidates = ['путёвка','программа','отдых','каникулы','смена','цена',
      'вожатый','рейтинг','бассейн','питание','оздоровительный','комфортный'];
    out.lsiWords = candidates.filter(w => lsiInsight.toLowerCase().includes(w.toLowerCase().slice(0,5)));
  }

  // 3. Обратная связь от петли измерения: какой шаблон даёт лучшие позиции.
  // Фабрика предпочитает шаблон с лучшим индексированием/средней позицией.
  try {
    const { rows } = await client.query(`
      SELECT template, COUNT(*) FILTER (WHERE in_index) AS indexed, COUNT(*) AS total,
             AVG(position) FILTER (WHERE in_index) AS avg_pos
      FROM seo_page_performance
      WHERE measured_date = (SELECT MAX(measured_date) FROM seo_page_performance)
      GROUP BY template ORDER BY avg_pos ASC NULLS LAST
    `);
    if (rows.length) {
      out.bestTemplate = rows[0].template;
      out.perfHint = rows.map(r => `${r.template}: ${r.indexed}/${r.total} в индексе, ср.поз ${r.avg_pos ? Number(r.avg_pos).toFixed(1) : '—'}`).join('; ');
    }
  } catch { /* таблицы ещё нет — первый запуск */ }

  return out;
}

// ── SLUG GENERATOR ────────────────────────────────────────────
function toSlug(keyword) {
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh',
    'з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o',
    'п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
    'ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
  };
  return keyword.toLowerCase()
    .split('').map(c => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

// Убирает год (4 цифры 20xx/19xx) из ключевого слова, чтобы шаблон не добавлял его повторно
function stripYear(kw) {
  return kw.replace(/\b(19|20)\d{2}\b/g, '').replace(/\s{2,}/g, ' ').trim();
}

// ── DETECT TEMPLATE TYPE ──────────────────────────────────────
function detectType(cluster) {
  const kw = cluster.mainKeyword.toLowerCase();

  // Гео-паттерны: запрос содержит город
  const geoWords = [
    'москв','подмосковь','зеленоград','химк','одинцов','балаших',
    'пушкин','люберц','королев','домодедов','ступин','щелков','серпухов',
    'истр','раменск','жуковск','клин','бронниц','наро-фоминск','наро фоминск'
  ];
  if (geoWords.some(g => kw.includes(g))) return 'geo';

  // Тематические IT
  if (kw.includes('it') || kw.includes('айти') || kw.includes('програм')) return 'it';

  // Ценовые запросы
  if (kw.includes('цен') || kw.includes('стоим') || kw.includes('недорог') || kw.includes('дешев')) return 'price';

  return 'nch'; // по умолчанию — короткий НЧ-лендинг
}

// ── CONTENT GENERATORS ────────────────────────────────────────
function generateNchContent(cluster, rag = {}) {
  const main = cluster.mainKeyword;
  const allKw = cluster.keywords.join(', ');
  const slug  = toSlug(main);
  const lsi   = (rag.lsiWords || []);
  const mainClean = stripYear(main);

  const title       = `${capitalize(mainClean)} 2026 — IT-лагерь АйДаКемп в Подмосковье`;
  const description = `${capitalize(main)} — детский IT-лагерь АйДаКемп в Подмосковье 2026. Python, AI, Minecraft, группы до 8 чел. Летние смены, актуальные цены на aidacamp.ru/ceny. Налоговый вычет 13%.`;
  const h1          = `${capitalize(mainClean)} 2026 — АйДаКемп`;

  const intro1 = `АйДаКемп — летний IT-лагерь в Подмосковье для школьников 7–15 лет. `
    + `Если вы ищете ${main}, здесь ребёнок не просто отдохнёт, а создаст настоящий проект: `
    + `игру, бота или анимацию. Смены проходят с июня по август 2026 года в санатории «Изумруд», `
    + `66 км от МКАД по Киевскому шоссе.`;

  const intro2 = `Программа включает треки по Python, AI и нейросетям, Minecraft Education, `
    + `Roblox Studio и 3D-моделированию. Занятия дважды в день по 90 минут, группы до 8 человек. `
    + `В конце смены — хакатон: каждый участник защищает собственный проект. `
    + `Актуальные цены смен — на aidacamp.ru/ceny, налоговый вычет 13% с образовательной части путёвки.`;

  const bullets = [
    `Треки: Python, AI, Minecraft, Roblox, 3D — выбор при записи`,
    `Группы до 8 человек, 1 преподаватель на 6–8 участников`,
    `Бассейн, 5-разовое питание, медработник 24/7`,
    `Смены 7, 10, 13 или 14 дней — июнь и август 2026`,
    `Трансфер от м. Солнцево (2 000 ₽), или на машине`,
    `Лицензия Минобрнауки, документы для налогового вычета`,
  ];

  // RAG-обогащение: вплетаем обязательные LSI-слова из накопленной экспертизы.
  // Источник правила — knowledge_chunks (seo:expertise: путёвка/программа/вожатый).
  if (lsi.length) {
    const lsiMap = {
      'путёвка':   `Путёвка в лагерь — актуальные цены на aidacamp.ru/ceny, всё включено: проживание, питание, программа`,
      'вожатый':   `Вожатый и преподаватель рядом круглосуточно — 1 взрослый на 6–8 ребят`,
      'оздоровительный': `Оздоровительный формат: бассейн, прогулки, режим дня, медконтроль`,
      'рейтинг':   `Один из лучших IT-лагерей Подмосковья по отзывам родителей на Яндекс.Картах`,
      'каникулы':  `Каникулы с пользой: ребёнок возвращается с готовым проектом, а не уставшим`,
    };
    for (const w of lsi) {
      const extra = lsiMap[w.toLowerCase()];
      if (extra && !bullets.some(b => b.includes(extra.slice(0, 20)))) bullets.push(extra);
    }
  }

  const faq1q = `Что такое ${main}?`;
  const faq1a = `${capitalize(main)} — это летний детский IT-лагерь с проживанием в Подмосковье. `
    + `АйДаКемп предлагает смены для школьников 7–15 лет с программами Python, AI, Minecraft, `
    + `Roblox и 3D-моделирования. Проходит в санатории «Изумруд», 66 км от МКАД.`;

  const faq2q = `Сколько стоит ${main} в 2026 году?`;
  const faq2a = `Актуальные цены смен — на aidacamp.ru/ceny. `
    + `В цену включены проживание, питание, IT-программа, бассейн и страховка. `
    + `Налоговый вычет 13% с образовательной части путёвки — оформляется через ФНС.`;

  const faq3q = `Как записаться в ${main}?`;
  const faq3a = `Выберите смену на странице цен, оставьте заявку — менеджер свяжется в течение часа. `
    + `Июльские смены занимают быстро, июнь и август 2026 ещё открыты.`;

  return {
    slug, title, description, h1,
    intro1, intro2, bullets,
    faq1q, faq1a, faq2q, faq2a, faq3q, faq3a
  };
}

function generateGeoContent(cluster, rag = {}) {
  // Для гео — упрощённая версия (без данных о маршруте)
  const main = cluster.mainKeyword;
  const slug  = toSlug(main);
  const mainClean = stripYear(main);
  const cityMatch = main.match(/(?:лагерь|лагеря)\s+(?:в\s+)?([а-яА-ЯёЁ]+(?:\s+[а-яА-ЯёЁ]+)?)/i);
  const city = cityMatch ? capitalize(cityMatch[1]) : capitalize(main.split(' ').pop());

  const title       = `${capitalize(mainClean)} 2026 — IT-лагерь АйДаКемп`;
  const description = `${capitalize(main)} — АйДаКемп в Подмосковье 2026. Python, AI, Minecraft, бассейн. Летние смены, актуальные цены на aidacamp.ru/ceny. Трансфер от м. Солнцево.`;
  const h1          = `${capitalize(mainClean)} 2026 — АйДаКемп`;

  // Для гео-страниц используем тот же НЧ-шаблон (гео-шаблон требует данных о маршруте)
  const intro1 = `АйДаКемп — детский IT-лагерь в Подмосковье для школьников 7–15 лет. `
    + `Расположен в санатории «Изумруд» в Наро-Фоминском районе, 66 км от МКАД по Киевскому шоссе. `
    + `Для семей из ${city} — организованный трансфер от м. Солнцево (2 000 ₽).`;

  const intro2 = `Программы: Python, AI и нейросети, Minecraft Education, Roblox Studio, 3D-моделирование. `
    + `Группы до 8 человек, занятия дважды в день. В финале смены — хакатон и готовый проект. `
    + `Актуальные цены смен — на aidacamp.ru/ceny, налоговый вычет 13% с образовательной части путёвки.`;

  const bullets = [
    `IT-треки: Python, AI, Minecraft, Roblox, 3D — на выбор`,
    `Группы до 8 человек, 1 преподаватель на 6–8 участников`,
    `Бассейн, 5-разовое питание, медработник 24/7`,
    `Трансфер от м. Солнцево, 2 000 ₽`,
    `Смены 7–14 дней, июнь и август 2026`,
  ];

  const faq1q = `Есть ли ${main.toLowerCase()} с проживанием в 2026?`;
  const faq1a = `АйДаКемп — загородный IT-лагерь с проживанием в Наро-Фоминском районе, `
    + `доступный из ${city}. Смены 7–14 дней, летом 2026, для школьников 7–15 лет.`;

  const faq2q = `Как добраться до лагеря из ${city}?`;
  const faq2a = `Организованный трансфер отправляется от м. Солнцево (2 000 ₽). `
    + `На машине: лагерь в Наро-Фоминском районе, 66 км от МКАД по Киевскому шоссе.`;

  const faq3q = `Сколько стоит лагерь в 2026 году?`;
  const faq3a = `Актуальные цены смен — на aidacamp.ru/ceny. `
    + `Включены питание, проживание, IT-программа. Налоговый вычет 13% с образовательной части путёвки.`;

  return {
    slug, title, description, h1,
    intro1, intro2, bullets,
    faq1q, faq1a, faq2q, faq2a, faq3q, faq3a
  };
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── TEMPLATE RENDERER ─────────────────────────────────────────
function renderTemplate(tmplName, vars) {
  let tpl = fs.readFileSync(path.join(TMPL_DIR, tmplName), 'utf8');

  // Маппинг ключей генератора → плейсхолдеры шаблона
  const ALIAS = {
    slug:'SLUG', title:'TITLE', description:'DESCRIPTION', h1:'H1',
    intro1:'INTRO_P1', intro2:'INTRO_P2',
    faq1q:'FAQ1_Q', faq1a:'FAQ1_A', faq2q:'FAQ2_Q', faq2a:'FAQ2_A', faq3q:'FAQ3_Q', faq3a:'FAQ3_A',
  };
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === 'string') {
      const ph = ALIAS[k] || k;
      tpl = tpl.replaceAll(`{{${ph}}}`, v.replace(/\\/g, '\\\\').replace(/`/g, '\\`'));
    }
  }

  // Bullets
  if (vars.bullets && Array.isArray(vars.bullets)) {
    const rendered = vars.bullets.map(b =>
      `      <li class="flex items-start gap-2 text-[16px] text-body">\n`
    + `        <i class="bi bi-check-lg text-primary mt-0.5 shrink-0" aria-hidden="true"></i>\n`
    + `        <span>${b}</span>\n`
    + `      </li>`
    ).join('\n');
    tpl = tpl.replace(/\{\{#BULLETS\}\}[\s\S]*?\{\{\/BULLETS\}\}/g, rendered);
  }

  return tpl;
}

// ── ALREADY EXISTS CHECK ──────────────────────────────────────
function pageExists(slug) {
  if (EXISTING_GEO_SLUGS.has(slug)) return true;
  const candidates = [
    path.join(PAGES_DIR, `${slug}.astro`),
    path.join(PAGES_DIR, `${slug}/index.astro`),
  ];
  return candidates.some(p => fs.existsSync(p));
}

// ── GEO DEDUP ─────────────────────────────────────────────────
// Собирает имена файлов (без .astro) из src/pages/ и src/pages/stati/
function buildExistingFileNames() {
  const names = new Set();
  const dirs = [PAGES_DIR, path.join(PAGES_DIR, 'stati')];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.astro')) names.add(f.slice(0, -6));
    }
  }
  return names;
}

// Извлекает транслит-токен города из гео-ключевика.
// "детский лагерь Истра Московская область" → "istra"
function extractCitySlugToken(keyword) {
  const kw = keyword.toLowerCase();
  const m = kw.match(/(?:лагерь|лагеря)\s+(?:в\s+|у\s+|из\s+)?([а-яё]+)/i);
  if (m) {
    const word = m[1];
    const skip = new Set(['для','с','без','по','от','до','над','под','при','про','через','между']);
    if (!skip.has(word)) return toSlug(word);
  }
  return toSlug(kw.trim().split(/\s+/).pop());
}

// Возвращает имя существующего файла если для города уже есть страница, иначе null.
// Поиск: токен города ∈ substring любого имени файла.
function findExistingGeoPage(keyword, existingFileNames) {
  const token = extractCitySlugToken(keyword);
  if (!token || token.length < 4) return null;
  for (const name of existingFileNames) {
    if (name.includes(token)) return name;
  }
  return null;
}

// ── WRITE PAGE ────────────────────────────────────────────────
function writePage(slug, content) {
  const filePath = path.join(PAGES_DIR, `${slug}.astro`);
  if (!DRY_RUN) fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// ── GIT OPERATIONS ────────────────────────────────────────────
function git(cmd) {
  return execSync(`git -C "${REPO_DIR}" ${cmd}`, { encoding: 'utf8' }).trim();
}

function setupBranch() {
  // Проверяем что ветка ещё не существует
  try {
    git(`show-ref --verify --quiet refs/heads/${BRANCH}`);
    log(`Ветка ${BRANCH} уже существует, используем её`);
    git(`checkout ${BRANCH}`);
  } catch {
    git(`checkout -b ${BRANCH}`);
    log(`Создана ветка ${BRANCH}`);
  }
}

function commitAndPush(files) {
  if (DRY_RUN || files.length === 0) return;
  const addList = files.map(f => `"${f}"`).join(' ');
  git(`add ${addList}`);
  git(`commit -m "feat(seo-factory): ${files.length} новых страниц [${TODAY}]"`);
  git(`push origin ${BRANCH}`);
  log(`Запушено ${files.length} файлов в ${BRANCH}`);
}

function createPR(pagesCount) {
  if (DRY_RUN) return;
  try {
    execSync(
      `gh pr create --base dev --head "${BRANCH}" `
    + `--title "feat(seo): SEO-фабрика ${TODAY} — ${pagesCount} страниц" `
    + `--body "Автоматически сгенерировано SEO-фабрикой.\\n\\n`
    + `**Страниц создано:** ${pagesCount}\\n`
    + `**Дата:** ${TODAY}\\n\\n`
    + `Каждая страница: НЧ/СЧ кластер без позиции → Astro лендинг → FAQPage schema."`,
      { cwd: REPO_DIR, encoding: 'utf8' }
    );
    log(`PR создан в dev для ${BRANCH}`);
  } catch (e) {
    log(`PR уже существует или ошибка: ${e.message.slice(0, 100)}`);
  }
}

// ── LOG RESULTS TO DB ─────────────────────────────────────────
async function logToDb(client, pages) {
  if (pages.length === 0) return;
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS seo_factory_log (
        id          SERIAL PRIMARY KEY,
        run_date    DATE NOT NULL,
        slug        TEXT NOT NULL,
        main_keyword TEXT,
        cluster_size INT,
        template    TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    for (const p of pages) {
      await client.query(
        `INSERT INTO seo_factory_log (run_date, slug, main_keyword, cluster_size, template)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [TODAY, p.slug, p.mainKeyword, p.clusterSize, p.template]
      );
    }
    log(`Записано ${pages.length} строк в seo_factory_log`);
  } catch (e) {
    log(`Не удалось записать в БД: ${e.message}`);
  }
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  log(`=== SEO Factory запуск ${TODAY} (dry-run=${DRY_RUN}, max=${MAX_PAGES}) ===`);

  const client = getDbClient();
  await client.connect();

  try {
    // 1. Получаем кластеры
    const clusters = await getClusters(client, MAX_PAGES * 2);
    log(`Найдено ${clusters.length} кластеров`);

    // 2. Генерируем страницы
    const createdFiles = [];
    const createdMeta  = [];

    if (!DRY_RUN) setupBranch();

    // Индекс существующих файлов для гео-дедупа (строится один раз)
    const existingFileNames = buildExistingFileNames();
    log(`Индекс файлов: ${existingFileNames.size} страниц`);

    for (const cluster of clusters) {
      if (createdFiles.length >= MAX_PAGES) break;

      const type = detectType(cluster);

      // Гео-дедуп: пропускаем если для города уже есть страница в репо
      if (type === 'geo') {
        const existingFile = findExistingGeoPage(cluster.mainKeyword, existingFileNames);
        if (existingFile) {
          log(`  ⏩  skip ${cluster.mainKeyword}: уже есть ${existingFile}`);
          continue;
        }
      }

      let vars;
      try {
        const rag = await enrichFromRAG(client, cluster);
        if (rag.lsiWords.length) log(`  🧠 RAG: LSI [${rag.lsiWords.join(', ')}]`);
        vars = type === 'geo' ? generateGeoContent(cluster, rag) : generateNchContent(cluster, rag);
      } catch (e) {
        log(`  ⚠️  Ошибка генерации для "${cluster.mainKeyword}": ${e.message}`);
        continue;
      }

      if (pageExists(vars.slug)) {
        log(`  ↩  Пропуск "${vars.slug}" — страница уже существует`);
        continue;
      }

      const tmpl   = 'nch-landing.astro.tpl'; // оба типа используют НЧ-шаблон в v1
      const content = renderTemplate(tmpl, vars);
      const filePath = writePage(vars.slug, content);

      log(`  ✅ ${vars.slug} (${cluster.mainKeyword}, freq=${cluster.maxFreq}, type=${type})`);
      createdFiles.push(filePath);
      createdMeta.push({
        slug: vars.slug,
        mainKeyword: cluster.mainKeyword,
        clusterSize: cluster.keywords.length,
        template: tmpl
      });
    }

    log(`Создано страниц: ${createdFiles.length}`);

    // 3. Git: коммит + пуш + PR
    if (createdFiles.length > 0) {
      commitAndPush(createdFiles);
      createPR(createdFiles.length);
    } else {
      log('Нет новых страниц для публикации');
    }

    // 4. Логируем в БД
    await logToDb(client, createdMeta);

    log(`=== Готово ===`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  main().catch(e => { log(`FATAL: ${e.message}\n${e.stack}`); process.exit(1); });
}
module.exports = { getClusters, detectType, generateNchContent, generateGeoContent, renderTemplate, enrichFromRAG, getDbClient, toSlug };
