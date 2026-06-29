import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

const STATI_DIR = join(process.cwd(), 'src/pages/stati');
const OUTPUT = join(process.cwd(), 'src/data/articles.ts');
const BASE_URL = 'https://aidacamp.ru';
const FALLBACK_IMAGE = '/images/hero/o-lagere.avif';

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  ogImage: string;
  url: string;
}

function extract(content: string, pattern: RegExp): string {
  const m = content.match(pattern);
  return m ? m[1].trim() : '';
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
    // template literal: grab text before first ${...} interpolation
    extract(content, /description=\{`([^`$]+)/) ||
    extract(content, /"description":\s*`([^`$]+)/);

  const ogImage = extract(content, /ogImage="([^"]+)"/) || FALLBACK_IMAGE;

  if (!title || !description) continue;

  articles.push({ slug, title, description, date, ogImage, url: `${BASE_URL}/stati/${slug}` });
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
  url: string;
}

export const articles: Article[] = ${JSON.stringify(articles, null, 2)};
`;

writeFileSync(OUTPUT, ts, 'utf-8');
console.log(`Записано ${articles.length} статей → src/data/articles.ts`);
