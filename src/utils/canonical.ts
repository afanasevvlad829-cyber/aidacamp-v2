/**
 * Нормализация URL под слеш-формат сайта.
 *
 * Сайт отдаётся в dir-формате (URL со слешем), а версии без слеша 301-редиректят
 * на слеш-версию. Значит canonical, og:url и schema-ссылки (breadcrumb item) ДОЛЖНЫ
 * вести на финальный слеш-URL — иначе получается «canonical → 301», противоречивый
 * сигнал поисковику. Инцидент 03.07.2026: 98 страниц хардкодили canonical без слеша
 * → выпадение aidacamp из Яндекса.
 *
 * Добавляет завершающий слеш, если путь без него и без расширения файла (.html/.xml
 * и т.п. не трогаем — это реальные файлы, а не директории).
 */
export function ensureTrailingSlash(u: string): string {
  try {
    const url = new URL(u);
    const last = url.pathname.split('/').pop() ?? '';
    if (!url.pathname.endsWith('/') && !last.includes('.')) url.pathname += '/';
    return url.href;
  } catch {
    return u;
  }
}
