/**
 * Ссылки на НАСТОЯЩИЕ отзывы.
 *
 * Правило: на лендингах не должно быть цитат, подписанных именами
 * («…текст…» — Наталья). Все реальные отзывы живут в двух местах:
 *   1) src/data/reviews.ts и src/data/reviewsSmena2.ts → страница /otzyvy/
 *   2) карточка лагеря на Яндекс.Картах
 * Вместо выдуманных цитат в блоках лендингов — обобщения без имён
 * плюс ссылки отсюда.
 *
 * Страж: `npm run check:reviews` (scripts/check-fake-reviews.sh) роняет билд,
 * если именная цитата снова появится в src/pages или src/data/landings.
 */

export const YANDEX_REVIEWS_URL =
  'https://yandex.ru/maps/org/aydakemp/35558479035/reviews/';

const LINK_CLASS =
  'text-orange-600 underline underline-offset-2 hover:text-orange-700';

/** Ссылка на страницу отзывов сайта. */
export function otzyvyLink(label = 'отзывы родителей'): string {
  return `<a href="/otzyvy/" class="${LINK_CLASS}">${label}</a>`;
}

/** Ссылка на отзывы в карточке Яндекс.Карт (внешняя). */
export function yandexReviewsLink(label = 'Яндекс.Картах'): string {
  return `<a href="${YANDEX_REVIEWS_URL}" target="_blank" rel="noopener" class="${LINK_CLASS}">${label}</a>`;
}
