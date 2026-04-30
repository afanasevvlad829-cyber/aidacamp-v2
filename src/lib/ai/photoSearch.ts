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
export function findPhotos(query: string, count = 4): PhotoResult[] {
  const q = query.toLowerCase();
  const base = photoIndex.base;

  // Считаем score по совпадению тегов
  const scored = (photoIndex.photos as Photo[]).map(photo => {
    const score = photo.tags.filter(tag =>
      q.includes(tag) || tag.split(' ').some(w => q.includes(w))
    ).length;
    return { photo, score };
  });

  // Сортируем по релевантности; среди равных по score — перемешиваем для разнообразия
  const filtered = scored.filter(s => s.score > 0);
  filtered.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Math.random() - 0.5; // shuffle ties
  });

  const results = filtered
    .slice(0, count)
    .map(s => ({
      url: base + s.photo.file,
      caption: s.photo.caption,
    }));

  // Если ничего не нашли — возвращаем разнообразные фото атмосферы лагеря
  if (!results.length) {
    const fallback = [
      { url: base + 'camp-smile.avif', caption: 'Атмосфера лагеря' },
      { url: base + 'camp-group-beanbags.avif', caption: 'Дети в лагере' },
      { url: base + 'study-dome-group.avif', caption: 'Занятия' },
      { url: base + 'hackathon-present.avif', caption: 'Хакатон' },
    ];
    // shuffle fallback
    fallback.sort(() => Math.random() - 0.5);
    return fallback.slice(0, count);
  }

  return results;
}
