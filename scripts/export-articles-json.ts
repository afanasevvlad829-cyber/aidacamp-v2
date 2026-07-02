import { readFileSync, writeFileSync } from 'fs';

// articles.json — Content Collection (id = slug), VK-постер на сервере ждёт поле `slug`.
const raw = JSON.parse(readFileSync('../src/data/articles.json', 'utf8'));
const articles = raw.map(({ id, ...rest }: { id: string; [k: string]: unknown }) => ({ slug: id, ...rest }));

writeFileSync('/tmp/articles.json', JSON.stringify(articles, null, 2));
console.log(`Exported ${articles.length} articles → /tmp/articles.json`);
