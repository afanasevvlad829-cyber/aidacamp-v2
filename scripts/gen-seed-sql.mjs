import fs from 'node:fs';
const src = fs.readFileSync('src/data/articleViews.ts', 'utf8');
const m = src.match(/ARTICLE_VIEWS[^=]*=\s*(\{[\s\S]*?\});/);
const views = JSON.parse(m[1]);
let sql = '-- seed article_views из снимка Метрики (idempotent)\n';
for (const [slug, n] of Object.entries(views)) {
  const s = slug.replace(/'/g, "''");
  sql += `INSERT INTO article_views (slug, views, updated_at) VALUES ('${s}', ${n}, now()) ON CONFLICT (slug) DO UPDATE SET views=GREATEST(article_views.views, EXCLUDED.views), updated_at=now();\n`;
}
fs.writeFileSync('scripts/article-views-seed.sql', sql);
console.log('✓ scripts/article-views-seed.sql —', Object.keys(views).length, 'строк');
