/**
 * rAF easeOut counter + IntersectionObserver.
 *
 * Паттерн взят из AnimatedStat.astro:
 * - easeOut cubic (1 - (1-t)^3)
 * - длительность 1400 мс по умолчанию
 * - поддержка float (одна цифра после запятой)
 * - уважает prefers-reduced-motion
 * - unobserve после первого срабатывания
 */

const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/**
 * Анимирует числовое значение элемента от `from` до `to` за `duration` мс.
 * Читает data-атрибуты prefix/unit если элемент их имеет (совместимость с AnimatedStat).
 */
export function animateCounter(
  el: HTMLElement,
  from: number,
  to: number,
  duration = 1400,
): void {
  const prefix = el.dataset.prefix ?? '';
  const unit = el.dataset.unit ?? '';
  const isFloat = String(to).includes('.');

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const display = isFloat ? to.toFixed(1) : String(Math.round(to));
    el.textContent = prefix + display + unit;
    return;
  }

  const start = performance.now();

  function tick(now: number) {
    const progress = Math.min((now - start) / duration, 1);
    const current = easeOut(progress) * (to - from) + from;
    const display = isFloat ? current.toFixed(1) : Math.round(current).toString();
    el.textContent = prefix + display + unit;
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      // Зафиксировать точное финальное значение
      const finalDisplay = isFloat ? to.toFixed(1) : String(Math.round(to));
      el.textContent = prefix + finalDisplay + unit;
    }
  }

  requestAnimationFrame(tick);
}

/**
 * Наблюдает за элементами с `[data-animate-count]` (или переданным `selector`).
 * Атрибут data-target задаёт целевое число (совместимость с AnimatedStat).
 * При появлении в viewport запускает animateCounter и перестаёт наблюдать.
 */
export function initAnimateOnScroll(selector = '[data-animate-count]'): void {
  if (typeof window === 'undefined') return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const raw = el.dataset.target ?? el.dataset.animateCount ?? '0';
        const to = parseFloat(raw);
        animateCounter(el, 0, to);
        observer.unobserve(el);
      });
    },
    { threshold: 0.4 },
  );

  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    observer.observe(el);
  });
}
