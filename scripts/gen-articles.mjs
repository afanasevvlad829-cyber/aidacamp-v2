/**
 * gen-articles.mjs — генератор реестра статей src/data/articles.ts.
 *
 * Единый источник метаданных каталога /stati/ — это сами статьи (их <ArticleHero>).
 * Скрипт извлекает title / subtitle / readTime из каждого файла src/pages/stati/*.astro,
 * берёт дату из articleDates.ts, классифицирует рубрику по slug и пишет articles.ts.
 *
 * Запуск:  node scripts/gen-articles.mjs
 * Идемпотентно: повторный прогон даёт тот же результат. Ручные исключения по рубрике/тегу —
 * в карте OVERRIDES ниже (а не правкой articles.ts, который перезаписывается).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const STATI_DIR = path.join(ROOT, 'src/pages/stati');
const DATES_FILE = path.join(ROOT, 'src/data/articleDates.ts');
const OUT_FILE = path.join(ROOT, 'src/data/articles.ts');

// Рубрики каталога (порядок = порядок секций на странице)
const CLUSTERS = {
  lager:   { label: 'Лагерь и летний отдых',        color: 'emerald', tag: 'Лагерь',        tagColor: 'bg-emerald-100 text-emerald-700' },
  it:      { label: 'IT и программирование',         color: 'orange',  tag: 'IT',            tagColor: 'bg-orange-100 text-orange-700' },
  gadgets: { label: 'Гаджеты и зависимость',         color: 'red',     tag: 'Зависимость',   tagColor: 'bg-red-100 text-red-700' },
  teens:   { label: 'Подростки и воспитание',        color: 'purple',  tag: 'Воспитание',    tagColor: 'bg-purple-100 text-purple-700' },
  money:   { label: 'Деньги и документы',            color: 'amber',   tag: 'Документы',     tagColor: 'bg-amber-100 text-amber-700' },
  geo:     { label: 'Лагерь по городам',             color: 'sky',     tag: 'География',     tagColor: 'bg-sky-100 text-sky-700' },
};

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

// Сбор статей
const files = fs.readdirSync(STATI_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
const articles = [];
for (const file of files) {
  const slug = file.replace(/\.astro$/, '');
  const src = fs.readFileSync(path.join(STATI_DIR, file), 'utf8');
  const block = getHeroBlock(src);
  const title = extractProp(block, 'title');
  const description = extractProp(block, 'subtitle');
  const readTimeRaw = extractProp(block, 'readTime');
  const readTime = readTimeRaw ? readTimeRaw.replace(/\s*чтения/, '') : '';
  if (!title) { console.error(`⚠ нет title в ${file} — пропуск`); continue; }
  const cluster = classifyCluster(slug);
  articles.push({
    slug,
    url: `/stati/${slug}`,
    title,
    description,
    cluster,
    tag: deriveTag(slug, cluster),
    tagColor: CLUSTERS[cluster].tagColor,
    readTime,
    date: DATES[slug] || '',
  });
}

// Сортировка: по дате (свежие сверху), затем по алфавиту
articles.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.slug.localeCompare(b.slug));

const banner = `// АВТОГЕНЕРАЦИЯ — не редактировать вручную.
// Источник: src/pages/stati/*.astro (<ArticleHero>) + src/data/articleDates.ts.
// Регенерация: node scripts/gen-articles.mjs. Исключения рубрик — в scripts/gen-articles.mjs (OVERRIDES).
`;

const clustersOut = Object.entries(CLUSTERS)
  .map(([id, c]) => `  { id: ${JSON.stringify(id)}, label: ${JSON.stringify(c.label)}, color: ${JSON.stringify(c.color)} },`)
  .join('\n');

const articlesOut = articles
  .map(a => `  ${JSON.stringify(a)},`)
  .join('\n');

const out = `${banner}
export type Article = {
  slug: string;
  url: string;
  title: string;
  description: string;
  cluster: string;
  tag: string;
  tagColor: string;
  readTime: string;
  date: string;
};

export type Cluster = { id: string; label: string; color: string };

export const CLUSTERS: Cluster[] = [
${clustersOut}
];

export const ARTICLES: Article[] = [
${articlesOut}
];

export const ARTICLE_COUNT = ARTICLES.length;

/** Статьи одной рубрики (в порядке ARTICLES — по свежести). */
export function articlesByCluster(id: string): Article[] {
  return ARTICLES.filter(a => a.cluster === id);
}
`;

fs.writeFileSync(OUT_FILE, out);
console.log(`✓ ${OUT_FILE} — ${articles.length} статей`);
for (const c of Object.keys(CLUSTERS)) {
  console.log(`  ${c}: ${articles.filter(a => a.cluster === c).length}`);
}
