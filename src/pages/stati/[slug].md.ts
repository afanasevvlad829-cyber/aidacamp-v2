export const prerender = true; // статья уже готова в articles.json на этапе gen-articles.mjs
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import TurndownService from 'turndown';

// Markdown-зеркало каждой статьи /stati/<slug>/ рядом с HTML — GEO/AI-SEO конвенция
// (llms.txt задаёт индекс, .md отдаёт агенту чистый текст конкретной страницы без
// вёрстки/меню/футера). Источник — contentHtml из articles.json: тот же текст, что
// уже очищен gen-articles.mjs от виджетов (data-rss-strip) для RSS/llms-full.txt,
// поэтому конвертация в markdown не тянет за собой лишний HTML-шум.
const BASE = 'https://aidacamp.ru';

const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

export async function getStaticPaths() {
  const articles = await getCollection('articles');
  return articles.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }));
}

export const GET: APIRoute = ({ props }) => {
  const entry = (props as { entry: Awaited<ReturnType<typeof getCollection<'articles'>>>[number] }).entry;
  const { title, description, url, date, contentHtml } = entry.data;

  const body = `# ${title}

> ${description}

Source: ${BASE}${url}
Published: ${date}

---

${turndown.turndown(contentHtml)}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/markdown; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
