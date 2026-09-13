/**
 * Общий приём для тяжёлых интерактивных блоков ниже экрана: не грузить их JS,
 * пока блок не показался в вьюпорте. Тот же принцип, что у колеса фортуны
 * (динамический import по условию), но триггер — не рантайм-конфиг, а
 * видимость элемента. Аналог client:visible из Astro Islands для обычного
 * <script> (client:visible работает только для фреймворк-компонентов).
 *
 * rootMargin с запасом вперёд по скроллу — чанк успевает подгрузиться
 * до того, как пользователь долистает до самого блока.
 */
export function lazyOnVisible(el: Element | null, load: () => Promise<{ default?: () => void } | Record<string, () => void>>, exportName?: string) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) {
    // Старые браузеры без IntersectionObserver — грузим сразу, деградация безопасна.
    load().then((m) => (exportName ? (m as any)[exportName] : m.default)?.());
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      load().then((m) => (exportName ? (m as any)[exportName] : m.default)?.());
    },
    { rootMargin: '200px 0px' }
  );
  io.observe(el);
}
