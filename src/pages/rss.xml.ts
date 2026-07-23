export const prerender = false;
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getPool } from '../lib/db';

const BASE_URL = 'https://aidacamp.ru';

function toRFC822(date: string | Date): string {
  return new Date(date).toUTCString();
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
  // pubDate = дата публикации В ФИД (rss_published_at), не дата статьи:
  // Дзен импортирует только записи, свежие на момент опроса фида — со старой
  // датой статьи он их молча пропускает.
  const pubDates = new Map<string, Date>();
  try {
    const pool = getPool();
    if (pool) {
      const { rows } = await pool.query(
        `SELECT slug, rss_published_at FROM article_views WHERE rss_published_at IS NOT NULL ORDER BY rss_published_at DESC LIMIT 100`
      );
      for (const r of rows as { slug: string; rss_published_at: Date }[]) {
        pubDates.set(r.slug, r.rss_published_at);
      }
    }
  } catch (e) {
    // БД недоступна/ошибка запроса — фид уйдёт ПУСТЫМ, поэтому шумим в лог, чтобы
    // поломка не пряталась месяцами. Инцидент 07.2026: у роли сайта не было SELECT
    // на article_views → запрос падал → пустой RSS → ноль трафика из Дзена, и никто
    // не замечал, потому что ошибка глоталась молча.
    console.error('[rss.xml] запрос rss_published_at упал, фид будет пустым:', e instanceof Error ? e.message : e);
  }

  const articleEntries = await getCollection('articles');
  const articles = articleEntries.map(e => ({ slug: e.id, ...e.data }));
  const published = articles.filter(a => pubDates.has(a.slug));

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
    <pubDate>${toRFC822(pubDates.get(a.slug) ?? a.date)}</pubDate>
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
