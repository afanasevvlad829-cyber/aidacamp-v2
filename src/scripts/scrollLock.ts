/**
 * iOS scroll-lock утилита.
 *
 * overflow:hidden один не останавливает скролл на iOS Safari —
 * нужно переключать body в position:fixed с сохранением позиции.
 *
 * Паттерн взят из SiteSearch.astro и MobileMenu.astro.
 */

let _savedScrollY = 0;

/** Фиксирует страницу: запоминает scrollY, ставит body position:fixed. */
export function lockScroll(): void {
  _savedScrollY = window.scrollY;
  Object.assign(document.body.style, {
    position: 'fixed',
    top: `-${_savedScrollY}px`,
    width: '100%',
    overflow: 'hidden',
  });
}

/** Снимает фиксацию и восстанавливает позицию скролла. */
export function unlockScroll(): void {
  Object.assign(document.body.style, {
    position: '',
    top: '',
    width: '',
    overflow: '',
  });
  window.scrollTo(0, _savedScrollY);
}
