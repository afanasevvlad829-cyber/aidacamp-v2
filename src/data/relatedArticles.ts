/**
 * relatedArticles — автоматическая перелинковка статей блога между собой.
 *
 * SEO-фикс (Labrika 15.07.2026): ~90 статей /stati/ имели <5 входящих
 * внутренних ссылок (обычно только одну — с хаба /stati/). Кольцевая схема
 * гарантирует каждой статье РОВНО RING_LINKS входящих ссылок от других статей
 * (+1 с хаба = минимум 5): статьи сортируются по (cluster, id), i-я ссылается
 * на следующие RING_LINKS по кругу. Соседи почти всегда из того же кластера;
 * на границах кластеров возможен переход в соседний — это осознанный
 * компромисс: равномерность входящих важнее строгой тематичности.
 *
 * Источник данных — articles.json (тот же, что у хаба /stati/): новая статья
 * попадает в кольцо автоматически, ничего дописывать не нужно.
 */
import articlesJson from './articles.json';

export interface RelatedArticle {
  url: string;
  title: string;
  description: string;
}

interface ArticleEntry {
  id: string;
  url: string;
  title: string;
  description: string;
  cluster: string;
}

/** Сколько статей получает ссылку от каждой статьи (= сколько входящих получает каждая). */
const RING_LINKS = 4;

// Стабильный порядок кольца: кластер → id. Не зависит от порядка в JSON,
// поэтому добавление статьи сдвигает ссылки только внутри её кластера.
const ring: ArticleEntry[] = (articlesJson as ArticleEntry[])
  .slice()
  .sort((a, b) => a.cluster.localeCompare(b.cluster) || a.id.localeCompare(b.id));

/**
 * Возвращает RING_LINKS статей-соседей по кольцу для страницы статьи.
 * Для URL вне articles.json (хаб, лендинги) возвращает пустой массив.
 */
export function getRelatedArticles(currentPath: string): RelatedArticle[] {
  const norm = currentPath.replace(/\/+$/, '') + '/';
  const idx = ring.findIndex((a) => a.url === norm);
  if (idx === -1 || ring.length < 2) return [];
  const count = Math.min(RING_LINKS, ring.length - 1);
  return Array.from({ length: count }, (_, k) => ring[(idx + 1 + k) % ring.length]).map(
    ({ url, title, description }) => ({ url, title, description }),
  );
}
