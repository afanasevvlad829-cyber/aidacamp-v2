export const prerender = false;
import type { APIRoute } from 'astro';
import { articles } from '../data/articles';

const BASE_URL = 'https://aidacamp.ru';

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

export const GET: APIRoute = () => {
  const items = articles.slice(0, 50).map(a => {
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
