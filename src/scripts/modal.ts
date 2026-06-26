/**
 * Modal утилиты — общие паттерны для модальных окон и оверлеев.
 *
 * Паттерн Escape-listener встречается в SiteSearch.astro, MobileMenu.astro,
 * Mentors.astro, Stay.astro.
 */

/**
 * Добавляет обработчик клавиши Escape и возвращает функцию-cleanup.
 *
 * Использование:
 *   const removeEscape = onEscape(() => closeModal());
 *   // при закрытии модалки:
 *   removeEscape();
 *
 * @param handler — функция, вызываемая при нажатии Escape
 * @returns cleanup-функция для снятия listener
 */
export function onEscape(handler: () => void): () => void {
  const listener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') handler();
  };
  document.addEventListener('keydown', listener);
  return () => document.removeEventListener('keydown', listener);
}
