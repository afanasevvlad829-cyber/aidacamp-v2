/**
 * reveal.ts — IntersectionObserver-driven reveal-on-scroll анимация.
 * Добавляет .reveal-in когда элемент появляется в viewport.
 * Stagger через data-reveal-delay="100" (мс).
 */
export function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('.reveal:not(.reveal-in)');
  if (!els.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((el) => el.classList.add('reveal-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const delay = Number(el.dataset.revealDelay || '0');
          setTimeout(() => el.classList.add('reveal-in'), delay);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  els.forEach((el) => observer.observe(el));
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initReveal);
  if (document.readyState !== 'loading') initReveal();
}
