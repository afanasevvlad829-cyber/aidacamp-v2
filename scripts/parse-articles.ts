import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

// Поддержка запуска как из основного репо, так и из worktree
const _local = join(process.cwd(), 'src/pages/stati');
const _worktree = join(process.cwd(), '../../src/pages/stati');
const STATI_DIR = existsSync(_local) ? _local : _worktree;
const PUBLIC_DIR = join(process.cwd(), 'public');
const OUTPUT = join(process.cwd(), 'src/data/articles.ts');
const BASE_URL = 'https://aidacamp.ru';
const FALLBACK_IMAGE = '/images/hero/o-lagere.avif';

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  ogImage: string;
  ogImageJpg: string;
  url: string;
  contentHtml: string;
}

function extract(content: string, pattern: RegExp): string {
  const m = content.match(pattern);
  return m ? m[1].trim() : '';
}

// Найти jpg версию avif изображения
function findJpgImage(avifPath: string): string {
  // /images/hero/foo.avif → /images/hero/jpg/foo.jpg
  const m = avifPath.match(/\/images\/hero\/([^/]+)\.avif$/);
  if (m) {
    const jpgPath = `/images/hero/jpg/${m[1]}.jpg`;
    if (existsSync(join(PUBLIC_DIR, jpgPath))) return jpgPath;
  }
  // уже jpg/png
  if (avifPath.match(/\.(jpg|jpeg|png)$/i)) return avifPath;
  return '/images/hero/jpg/o-lagere.jpg';
}

// Извлечь и очистить HTML контент статьи для RSS/content:encoded
function extractContent(astroSource: string): string {
  // Берём блок <article>...</article>
  const articleMatch = astroSource.match(/<article[^>]*>([\s\S]*?)<\/article>/);
  if (!articleMatch) return '';
  let html = articleMatch[1];

  // Удалить Astro-компоненты (теги с заглавной буквы и их содержимое)
  html = html.replace(/<[A-Z][A-Za-z]*[^>]*\/>/g, '');
  html = html.replace(/<[A-Z][A-Za-z]*[^>]*>[\s\S]*?<\/[A-Z][A-Za-z]*>/g, '');

  // Удалить Bootstrap иконки
  html = html.replace(/<i\s[^>]*class="bi[^"]*"[^>]*><\/i>/g, '');
  html = html.replace(/<i\s[^>]*class="bi[^"]*"[^>]*\/>/g, '');

  // Удалить list-accent-dot
  html = html.replace(/<div[^>]*class="list-accent-dot"[^>]*><\/div>/g, '');

  // Преобразовать h2/h3 заголовки — сохранить только текст внутри
  html = html.replace(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/g, (_, n, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    return `<h${n}>${text}</h${n}>`;
  });

  // Преобразовать div-карточки (border rounded) в p
  html = html.replace(/<div[^>]*class="[^"]*border[^"]*rounded[^"]*"[^>]*>([\s\S]*?)<\/div>/g, (_, inner) => {
    const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? `<p>${text}</p>` : '';
  });

  // Удалить class и style атрибуты
  html = html.replace(/\s(class|style|aria-hidden|aria-label|role)="[^"]*"/g, '');

  // Убрать пустые div/span, оставить содержимое
  html = html.replace(/<div[^>]*>([\s\S]*?)<\/div>/g, '$1');
  html = html.replace(/<span[^>]*>([\s\S]*?)<\/span>/g, '$1');

  // Преобразовать strong/b и em/i (оставить)
  // Убрать теги li-wrapper flex/items-start
  html = html.replace(/<li[^>]*>/g, '<li>');

  // Сжать пробелы и пустые строки
  html = html.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();

  // Убрать пустые теги
  html = html.replace(/<(p|li|h[2-4])>\s*<\/\1>/g, '');

  return html;
}

const files = readdirSync(STATI_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
const articles: Article[] = [];

for (const file of files) {
  const slug = basename(file, '.astro');
  const content = readFileSync(join(STATI_DIR, file), 'utf-8');

  const date = extract(content, /"datePublished":\s*"([^"]+)"/);
  if (!date) continue;

  const rawTitle = extract(content, /title="([^"]+)"/);
  const title = rawTitle.replace(/\s*\|\s*АйДаКемп\s*$/, '').trim();
  const description =
    extract(content, /description="([^"]+)"/) ||
    extract(content, /description='([^']+)'/) ||
    extract(content, /const\s+description\s*=\s*['"]([^'"]+)['"]/) ||
    extract(content, /"description":\s*"([^"]+)"/) ||
    extract(content, /description=\{`([^`$]+)/) ||
    extract(content, /"description":\s*`([^`$]+)/);

  const ogImage = extract(content, /ogImage="([^"]+)"/) || FALLBACK_IMAGE;
  const ogImageJpg = findJpgImage(ogImage);
  const contentHtml = extractContent(content);

  if (!title || !description) continue;

  articles.push({
    slug,
    title,
    description,
    date,
    ogImage,
    ogImageJpg,
    url: `${BASE_URL}/stati/${slug}`,
    contentHtml,
  });
}

articles.sort((a, b) => b.date.localeCompare(a.date));

const ts = `// Автогенерировано scripts/parse-articles.ts — не редактировать вручную
// Запуск: npx tsx scripts/parse-articles.ts

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  ogImage: string;
  ogImageJpg: string;
  url: string;
  contentHtml: string;
}

export const articles: Article[] = ${JSON.stringify(articles, null, 2)};
`;

writeFileSync(OUTPUT, ts, 'utf-8');
console.log(`Записано ${articles.length} статей → src/data/articles.ts`);
