export const prerender = false;
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
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

function wrapCdata(html: string): string {
  // Дзен принимает CDATA в content:encoded
  return `<![CDATA[${html}]]>`;
}

export const GET: APIRoute = async () => {
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
    // БД недоступна — пустой фид
  }

  const articleEntries = await getCollection('articles');
  const articles = articleEntries.map(e => ({ slug: e.id, ...e.data }));
  const published = articles.filter(a => publishedSlugs.has(a.slug));

  const items = published.map(a => {
    // Фолбэк: без ogImageJpg (у части статей его нет) весь фид падал в 500 (TypeError startsWith)
    const rawImg = a.ogImageJpg || a.ogImage || '/images/hero/jpg/o-lagere.jpg';
    const imageUrl = rawImg.startsWith('http') ? rawImg : `${BASE_URL}${rawImg}`;
    // Дзену нужны АБСОЛЮТНЫЕ ссылки в <link>/<guid>, иначе импорт статей не работает.
    // a.url в articles.ts относительный (/stati/...) — дополняем доменом здесь.
    const absUrl = a.url.startsWith('http') ? a.url : `${BASE_URL}${a.url}`;
    return `  <item>
    <title>${esc(a.title)}</title>
    <link>${esc(absUrl)}</link>
    <description>${esc(a.description)}</description>
    <pubDate>${toRFC822(a.date)}</pubDate>
    <guid isPermaLink="true">${esc(absUrl)}</guid>
    <category>format-article</category>
    <enclosure url="${esc(imageUrl)}" type="image/jpeg" length="0"/>
    <content:encoded>${wrapCdata(a.contentHtml)}</content:encoded>
  </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:content="http://purl.org/rss/modules/content/"
  xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>АйДаКемп — блог об IT-лагере для детей</title>
    <link>${BASE_URL}</link>
    <description>Статьи об IT-образовании, летнем отдыхе детей и опыте АйДаКемп</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${BASE_URL}/images/hero/jpg/o-lagere.jpg</url>
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
