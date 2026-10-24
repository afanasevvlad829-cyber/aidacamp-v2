/**
 * photoSearch.ts — поиск фото по тегам для gallery-блока
 */

import photoIndex from '../../data/photo-index.json';

interface Photo {
  file: string;
  tags: string[];
  caption: string;
}

interface PhotoResult {
  url: string;
  caption: string;
}

/**
 * Ищет 2–4 фото по тематике запроса.
 * query — тема (например "бассейн", "занятия программированием", "еда")
 */
export function findPhotos(query: string, count = 3): PhotoResult[] {
  const q = query.toLowerCase();
  const base = photoIndex.base;

  // Считаем score по совпадению тегов (двустороннее: тег в запросе ИЛИ слово запроса в теге)
  const qWords = q.split(/\s+/).filter(w => w.length > 2);
  const scored = (photoIndex.photos as Photo[]).map(photo => {
    const score = photo.tags.filter(tag => {
      const t = tag.toLowerCase();
      return q.includes(t) || t.includes(q) || qWords.some(w => t.includes(w) || w.includes(t));
    }).length;
    return { photo, score };
  });

  // Сортируем по релевантности, берём топ
  const results = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(s => ({
      url: base + s.photo.file,
      caption: s.photo.caption,
    }));

  // Если ничего не нашли — возвращаем общие фото атмосферы
  if (!results.length) {
    return [
      { url: base + 'camp-smile.avif', caption: 'Атмосфера лагеря' },
      { url: base + 'camp-group-beanbags.avif', caption: 'Дети в лагере' },
      { url: base + 'study-dome-group.avif', caption: 'Занятия' },
    ].slice(0, count);
  }

  return results;
}
