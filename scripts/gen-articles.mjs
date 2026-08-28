/**
 * gen-articles.mjs — генератор реестра статей src/data/articles.json (Content Collection).
 *
 * Единый источник метаданных каталога /stati/ — это сами статьи (их <ArticleHero>).
 * title/readTime — регексом по src/pages/stati/*.astro (статичные пропы, без Astro-выражений).
 * subtitle/contentHtml — из УЖЕ СОБРАННОГО dist/client/stati/<slug>/index.html: страницы
 * содержат `{PRICE_MIN}`, `{item.question}` и т.п. — Astro-выражения, которые резолвятся
 * только рендером, регекс по исходнику даёт их как есть, буквально в фигурных скобках
 * (баг найден при ревью sot-hardcode-cleanup: 100/150 статей несли нерезолвленные токены
 * в RSS/VK-репост). Поэтому этот скрипт запускается ПОСЛЕ `astro build`, не до/вместо —
 * см. package.json → "build". Извлекатели ищут маркеры data-rss-strip/data-article-subtitle,
 * добавленные в исходники виджетов (StatCallout/AnimatedStat/DonutChart/AnimatedBarChart/
 * ArticleBottomCta/BlogCTA/Vozrasty*, ArticleHero) — не угадывают их по CSS-классам.
 * Дата — из articleDates.ts, рубрика — классификатором по slug.
 * Схема данных описана в src/content.config.ts (Astro Content Layer API, file() loader).
 *
 * Запуск:  npx astro build && node scripts/gen-articles.mjs
 * Идемпотентно: повторный прогон даёт тот же результат. Ручные исключения по рубрике —
 * в карте OVERRIDES ниже (а не правкой articles.json, который перезаписывается).
 * Рубрики (label/tag/tagColor) — в src/data/articleClusters.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATI_DIR = path.join(ROOT, 'src/pages/stati');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_STATI_DIR = path.join(ROOT, 'dist/client/stati');
const DATES_FILE = path.join(ROOT, 'src/data/articleDates.ts');
const CLUSTERS_FILE = path.join(ROOT, 'src/data/articleClusters.json');
const OUT_FILE = path.join(ROOT, 'src/data/articles.json');
const FALLBACK_IMAGE = '/images/og-default.jpg';

// Найти jpg-версию avif изображения (для RSS/VK, которым нужен растровый формат)
function findJpgImage(avifPath) {
  const m = avifPath.match(/\/images\/hero\/([^/]+)\.avif$/);
  if (m) {
    const jpgPath = `/images/hero/jpg/${m[1]}.jpg`;
    if (fs.existsSync(path.join(PUBLIC_DIR, jpgPath))) return jpgPath;
  }
  if (avifPath.match(/\.(jpg|jpeg|png)$/i)) return avifPath;
  return FALLBACK_IMAGE;
}

// Удалить элемент, отмеченный булевым атрибутом-маркером (напр. data-rss-strip), вместе
// со всем содержимым. Ищет тег по имени и считает вложенность одноимённых тегов, чтобы
// корректно найти закрывающий тег даже при вложенных div/section одного типа.
function stripMarkedElements(html, marker) {
  let out = html;
  for (;;) {
    const attrIdx = out.indexOf(marker);
    if (attrIdx === -1) return out;
    const tagStart = out.lastIndexOf('<', attrIdx);
    const nameMatch = tagStart === -1 ? null : out.slice(tagStart).match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!nameMatch) throw new Error(`stripMarkedElements: не удалось разобрать тег с ${marker} (позиция ${attrIdx})`);
    const tagName = nameMatch[1];
    const openTagEnd = out.indexOf('>', attrIdx);
    const tagRe = new RegExp(`<\\/?${tagName}(?=[\\s>/])`, 'g');
    tagRe.lastIndex = openTagEnd + 1;
    let depth = 1;
    let closeEnd = -1;
    let m;
    while ((m = tagRe.exec(out))) {
      if (out[m.index + 1] === '/') {
        depth--;
        if (depth === 0) { closeEnd = out.indexOf('>', m.index) + 1; break; }
      } else {
        depth++;
      }
    }
    if (closeEnd === -1) throw new Error(`stripMarkedElements: не найден закрывающий </${tagName}> для ${marker} (позиция ${attrIdx})`);
    out = out.slice(0, tagStart) + out.slice(closeEnd);
  }
}

// Развернуть чисто структурные обёртки (div/span/button), сохранив их содержимое —
// рекурсивно, начиная с самых вложенных, пока такие теги не кончатся.
function unwrapStructuralTags(html) {
  const re = /<(div|span|button)\b[^>]*>((?:(?!<(?:div|span|button)\b)(?!<\/(?:div|span|button)>)[\s\S])*?)<\/\1>/g;
  let out = html;
  for (let i = 0; i < 200; i++) {
    const next = out.replace(re, '$2');
    if (next === out) return out;
    out = next;
  }
  throw new Error('unwrapStructuralTags: превышен лимит итераций — проверь входной HTML');
}

// Оставить только href у <a>, убрать все атрибуты (class/style/data-*/aria-*) у остальных тегов.
function stripAttrs(html) {
  return html.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*)?)(\/?)>/g, (_full, tag, attrs, selfClose) => {
    if (tag.toLowerCase() === 'a') {
      const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/);
      const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3]) : null;
      return href ? `<a href="${href}"${selfClose}>` : `<a${selfClose}>`;
    }
    return `<${tag}${selfClose}>`;
  });
}

// Извлечь и очистить HTML контент статьи из УЖЕ СОБРАННОЙ страницы (dist/client/stati/<slug>/
// index.html) — все Astro-выражения там уже отрендерены в реальные значения.
function extractRenderedContent(slug, distHtml) {
  // <article> — точнее (не тянет ArticleBottomCta, который обычно вне <article>, но внутри
  // <main>); часть старых статей вообще без <main>, только <article> — берём что есть.
  const match = distHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/)
    || distHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error(`extractRenderedContent: не найден ни <article>, ни <main> в собранной странице ${slug}`);
  let html = match[1];

  html = stripMarkedElements(html, 'data-rss-strip');
  html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');
  html = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  html = html.replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<i\b[^>]*class=(?:"[^"]*\bbi\b[^"]*"|'[^']*\bbi\b[^']*'|\S*\bbi-\S*)[^>]*>\s*<\/i>/g, '');
  html = html.replace(/<span\b[^>]*data-faq-icon[^>]*>[\s\S]*?<\/span>/g, '');
  html = html.replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return text ? `<h${n}>${text}</h${n}>` : '';
  });
  html = unwrapStructuralTags(html);
  html = stripAttrs(html);
  html = html.replace(/<(p|li|h[2-4])>\s*<\/\1>/g, '');
  html = html.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

  return html;
}

// Извлечь резолвленный subtitle из <p data-article-subtitle> (маркер в ArticleHero.astro) —
// в исходнике subtitle часто содержит Astro-выражения ({VYCHET_MAX} и т.п.), поэтому берём
// уже отрендеренный текст, а не regex по src/pages/stati/*.astro.
function extractRenderedSubtitle(slug, distHtml) {
  const m = distHtml.match(/<p\b[^>]*\bdata-article-subtitle\b[^>]*>([\s\S]*?)<\/p>/);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Извлечь резолвленный title из <h1 data-article-title> (маркер в ArticleHero.astro) — часть
// title-пропов написана как `template ${literal}` (напр. `... в ${SEASON_YEAR} году`), regex
// по исходнику отдаёт их нерезолвленными («в ${SEASON_YEAR} году»).
function extractRenderedTitle(slug, distHtml) {
  const m = distHtml.match(/<h1\b[^>]*\bdata-article-title\b[^>]*>([\s\S]*?)<\/h1>/);
  if (!m) return '';
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

// Рубрики каталога (порядок = порядок секций на странице) — src/data/articleClusters.json
const CLUSTERS = Object.fromEntries(
  JSON.parse(fs.readFileSync(CLUSTERS_FILE, 'utf8')).map(c => [c.id, c])
);

// Ручные исключения классификатора: slug -> cluster
const OVERRIDES = {
  'detskiy-lager-bez-telefonov': 'gadgets',
  'lager-i-orvi': 'lager',
  'istorii-iz-lagerya': 'lager',
  'vasya-i-sistema': 'it',
  'sovet-otryada': 'teens',
  'generational-advice': 'teens',
};

// Тонкие теги по ключевым словам в slug (приоритет сверху вниз). Если не подошло — тег рубрики.
const TAG_RULES = [
  [/zavisimost|igroman|priznaki|profilaktik|lechenie|izbavit/, 'Зависимость'],
  [/telefon|ekrannoe|gadzhet/, 'Экранное время'],
  [/python|scratch|programmirovan|roblox|3d|minecraft|geymdev|game-dev|robotehnik/, 'Программирование'],
  [/nejroset|\bai-|\bii-|ai-economy/, 'AI и нейросети'],
  [/hakaton|navyki|future-skills|meta-skills|professii|vnutrennyaya-ekonomik|finansovaya/, 'Навыки будущего'],
  [/nalog|vychet/, 'Налоговый вычет'],
  [/oplat|ceny|skolko-stoit|nedorog/, 'Цены'],
  [/spravki|dokument|licenz|strahovk/, 'Документы'],
  [/kak-vybrat|mify|reiting|otzyv|luchshie/, 'Выбор лагеря'],
  [/pervyj-raz|pervye-tri|ne-hochet-v-lager|boitsya|skuchaet|adaptaci/, 'Первый раз'],
  [/pitanie|zabolel|bezopasnost|territoriya|raspisanie|pravila|periody/, 'Жизнь в лагере'],
  [/podrostok|nichego-ne-hochet|samootsenka|problemy-v-obsch|uchitsya|introvert|giperaktiv|odarennogo|dvoyechnik/, 'Подростки'],
  [/podolsk|naro-fominsk|novaya-moskva/, 'География'],
];

function classifyCluster(slug) {
  if (OVERRIDES[slug]) return OVERRIDES[slug];
  if (/podolsk|naro-fominsk|novaya-moskva/.test(slug)) return 'geo';
  if (/zavisimost|telefon|kompyuter|igr|igroman|ekrannoe|gadzhet/.test(slug)) return 'gadgets';
  if (/podrostok|nichego-ne-hochet|samootsenka|problemy-v-obsch|ne-hochet-uchitsya|introvert|giperaktiv|odarennogo|dvoyechnik|nizkaya-samoots/.test(slug)) return 'teens';
  if (/nalog|vychet|oplat|skolko-stoit-detskiy|\bceny\b/.test(slug)) return 'money';
  if (/\bit-|python|nejroset|programmirovan|scratch|roblox|3d-model|minecraft|geymdev|game-dev|meta-skills|future-skills|ai-economy|ai-proekt|hakaton|navyki|vnutrennyaya-ekonomik|ii-zamenit|kiberbezopas|robotehnik|professii-budushch|nejroseti|finansovaya-gramotnost|letnyaya-shkola-programm/.test(slug)) return 'it';
  return 'lager';
}

function deriveTag(slug, cluster) {
  for (const [re, tag] of TAG_RULES) if (re.test(slug)) return tag;
  return CLUSTERS[cluster].tag;
}

// Извлечь значение пропа из блока <ArticleHero ... />
function extractProp(block, name) {
  // name="..."  либо  name={`...`}
  const dq = block.match(new RegExp(`${name}="((?:[^"\\\\]|\\\\.)*)"`));
  if (dq) return dq[1].replace(/\\"/g, '"').trim();
  const tl = block.match(new RegExp(`${name}=\\{\\\`([\\s\\S]*?)\\\`\\}`));
  if (tl) return tl[1].trim();
  return '';
}

function getHeroBlock(src) {
  const start = src.indexOf('<ArticleHero');
  if (start === -1) return '';
  const end = src.indexOf('/>', start);
  return end === -1 ? src.slice(start, start + 2000) : src.slice(start, end + 2);
}

// Даты
const datesSrc = fs.readFileSync(DATES_FILE, 'utf8');
const DATES = {};
for (const m of datesSrc.matchAll(/'([^']+)':\s*'(\d{4}-\d{2}-\d{2})'/g)) DATES[m[1]] = m[2];

if (!fs.existsSync(DIST_STATI_DIR)) {
  console.error(`✗ ${DIST_STATI_DIR} не найден — сначала прогони "astro build" (contentHtml/subtitle читаются из собранных страниц, не из исходников)`);
  process.exit(1);
}

// Сбор статей
const files = fs.readdirSync(STATI_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
const articles = [];
for (const file of files) {
  const slug = file.replace(/\.astro$/, '');
  const src = fs.readFileSync(path.join(STATI_DIR, file), 'utf8');
  const block = getHeroBlock(src);
  const readTimeRaw = extractProp(block, 'readTime');
  const readTime = readTimeRaw ? readTimeRaw.replace(/\s*чтения/, '') : '';
  if (!extractProp(block, 'title')) { console.error(`⚠ нет title в ${file} — пропуск`); continue; }

  const distFile = path.join(DIST_STATI_DIR, slug, 'index.html');
  if (!fs.existsSync(distFile)) {
    console.error(`✗ нет собранной страницы dist/client/stati/${slug}/index.html — пересобери сайт (astro build) перед gen-articles.mjs`);
    process.exit(1);
  }
  const distHtml = fs.readFileSync(distFile, 'utf8');
  const title = extractRenderedTitle(slug, distHtml);
  if (!title) throw new Error(`нет <h1 data-article-title> в собранной странице ${slug} — маркер потерян или разметка ArticleHero изменилась`);
  const description = extractRenderedSubtitle(slug, distHtml);
  const contentHtml = extractRenderedContent(slug, distHtml);

  const cluster = classifyCluster(slug);
  const ogImageMatch = src.match(/ogImage="([^"]+)"/);
  const ogImage = ogImageMatch ? ogImageMatch[1] : FALLBACK_IMAGE;
  articles.push({
    id: slug,
    // Trailing slash — канонич. форма сайта (ensureTrailingSlash). Без него внутренние
    // ссылки блога дают 301 на слеш-версию и жгут краул-бюджет (SEO-аудит: 142 редиректа с /stati/).
    url: `/stati/${slug}/`,
    title,
    description,
    cluster,
    tag: deriveTag(slug, cluster),
    tagColor: CLUSTERS[cluster].tagColor,
    readTime,
    date: DATES[slug] || '',
    ogImage,
    ogImageJpg: findJpgImage(ogImage),
    contentHtml,
  });
}

// Сортировка: по дате (свежие сверху), затем по алфавиту
articles.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));

fs.writeFileSync(OUT_FILE, JSON.stringify(articles, null, 2) + '\n');
console.log(`✓ ${OUT_FILE} — ${articles.length} статей`);
for (const c of Object.keys(CLUSTERS)) {
  console.log(`  ${c}: ${articles.filter(a => a.cluster === c).length}`);
}
