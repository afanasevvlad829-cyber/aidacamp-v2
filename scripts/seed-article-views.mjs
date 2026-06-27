/**
 * seed-article-views.mjs — засев/синхронизация счётчика article_views из снимка Метрики.
 *
 * Читает src/data/articleViews.ts (ARTICLE_VIEWS) и UPSERT-ит в article_views с GREATEST:
 * счётчик никогда не уменьшается (живые инкременты сохраняются, Метрика только поднимает планку).
 *
 * Запуск на сервере (есть DATABASE_URL):  node scripts/seed-article-views.mjs
 * Безопасно повторять. Можно повесить на cron после регенерации снимка.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = path.join(ROOT, 'src/data/articleViews.ts');

const url = process.env.DATABASE_URL;
if (!url) { console.error('✗ DATABASE_URL не задан'); process.exit(1); }

// Вытаскиваем объект ARTICLE_VIEVS из .ts без импорта TS
const src = fs.readFileSync(SNAP, 'utf8');
const m = src.match(/ARTICLE_VIEWS[^=]*=\s*(\{[\s\S]*?\});/);
if (!m) { console.error('✗ не нашёл ARTICLE_VIEWS в снимке'); process.exit(1); }
const views = JSON.parse(m[1]);
const entries = Object.entries(views);

const pool = new pg.Pool({ connectionString: url, max: 3 });
const client = await pool.connect();
try {
  let n = 0;
  for (const [slug, count] of entries) {
    await client.query(
      `INSERT INTO article_views (slug, views, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (slug) DO UPDATE
         SET views = GREATEST(article_views.views, EXCLUDED.views),
             updated_at = now()`,
      [slug, Number(count)],
    );
    n++;
  }
  console.log(`✓ Засеяно/обновлено ${n} статей в article_views`);
} finally {
  client.release();
  await pool.end();
}
