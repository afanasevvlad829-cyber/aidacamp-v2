export const prerender = false;
import type { APIRoute } from 'astro';
import { ARTICLES as articles } from '../data/articles';
import pg from 'pg';

const { Pool } = pg;

const BASE_URL = 'https://aidacamp.ru';

let _pool: InstanceType<typeof Pool> | null = null;
function getPool() {
  if (!_pool) {
    const url = process.env.DATABASE_URL || import.meta.env.DATABASE_URL;
    if (!url) return null;
    _pool = new Pool({ connectionString: url, max: 3 });
  }
  return _pool;
}

function toRFC822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = async () => {
  // Получаем слаги опубликованных статей из БД
  let publishedSlugs: Set<string> = new Set();
  try {
    const pool = getPool();
    if (pool) {
      const { rows } = await pool.query(
        `SELECT slug FROM article_views WHERE rss_published_at IS NOT NULL ORDER BY rss_published_at DESC LIMIT 100`
      );
      publishedSlugs = new Set(rows.map((r: { slug: string }) => r.slug));
    }
  } catch {
    // БД недоступна — отдаём пустой фид
  }

  const published = articles.filter(a => publishedSlugs.has(a.slug));

  const items = published.map(a => {
    const imageUrl = a.ogImage.startsWith('http') ? a.ogImage : `${BASE_URL}${a.ogImage}`;
    return `  <item>
    <title>${esc(a.title)}</title>
    <link>${esc(a.url)}</link>
    <description>${esc(a.description)}</description>
    <pubDate>${toRFC822(a.date)}</pubDate>
    <guid isPermaLink="true">${esc(a.url)}</guid>
    <enclosure url="${esc(imageUrl)}" type="image/avif" length="0"/>
  </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>АйДаКемп — блог об IT-лагере для детей</title>
    <link>${BASE_URL}</link>
    <description>Статьи об IT-образовании, летнем отдыхе детей и опыте АйДаКемп</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${BASE_URL}/images/hero/o-lagere.avif</url>
      <title>АйДаКемп</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
