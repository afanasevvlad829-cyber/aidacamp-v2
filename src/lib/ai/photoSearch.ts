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

  // Считаем score по совпадению тегов
  const scored = (photoIndex.photos as Photo[]).map(photo => {
    const score = photo.tags.filter(tag =>
      q.includes(tag) || tag.split(' ').some(w => q.includes(w))
    ).length;
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
      { url: base + 'camp-smile.jpg', caption: 'Атмосфера лагеря' },
      { url: base + 'camp-group-beanbags.jpg', caption: 'Дети в лагере' },
      { url: base + 'study-dome-group.jpg', caption: 'Занятия' },
    ].slice(0, count);
  }

  return results;
}
