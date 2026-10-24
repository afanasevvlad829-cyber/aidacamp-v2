/**
 * reveal.ts — IntersectionObserver-driven анимации:
 * 1. .reveal → .reveal-in (opacity + translateY fade-up)
 * 2. .shift-bar-fill → анимация заполнения progress bar
 * 3. .count-up[data-count-target] → count-up чисел от 0 до target
 *
 * Все анимации respect prefers-reduced-motion.
 */
export function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  initRevealEls(reduce);
  initProgressBars(reduce);
  initCountUps(reduce);
}

function initRevealEls(reduce: boolean) {
  const els = document.querySelectorAll<HTMLElement>('.reveal:not(.reveal-in)');
  if (!els.length) return;
  if (reduce) { els.forEach((el) => el.classList.add('reveal-in')); return; }
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

function initProgressBars(reduce: boolean) {
  const bars = document.querySelectorAll<HTMLElement>('.shift-bar-fill[data-target-pct]:not([data-pct-animated])');
  if (!bars.length) return;
  if (reduce) {
    bars.forEach((bar) => { bar.style.width = `${bar.dataset.targetPct}%`; bar.dataset.pctAnimated = '1'; });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const bar = entry.target as HTMLElement;
          const pct = bar.dataset.targetPct || '0';
          setTimeout(() => { bar.style.width = `${pct}%`; bar.dataset.pctAnimated = '1'; }, 350 + i * 80);
          observer.unobserve(bar);
        }
      });
    },
    { threshold: 0.5, rootMargin: '0px 0px -20px 0px' },
  );
  bars.forEach((bar) => observer.observe(bar));
}

function initCountUps(reduce: boolean) {
  const els = document.querySelectorAll<HTMLElement>('.count-up[data-count-target]:not([data-count-animated])');
  if (!els.length) return;
  if (reduce) {
    els.forEach((el) => {
      el.textContent = (el.dataset.countPrefix || '') + el.dataset.countTarget + (el.dataset.countSuffix || '');
      el.dataset.countAnimated = '1';
    });
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          animateCount(el);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5, rootMargin: '0px 0px -20px 0px' },
  );
  els.forEach((el) => observer.observe(el));
}

function animateCount(el: HTMLElement) {
  const target = parseFloat(el.dataset.countTarget || '0');
  const prefix = el.dataset.countPrefix || '';
  const suffix = el.dataset.countSuffix || '';
  const decimals = parseInt(el.dataset.countDecimals || '0', 10);
  const duration = parseInt(el.dataset.countDuration || '1400', 10);
  const start = performance.now();
  const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic
  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = ease(progress) * target;
    const formatted = decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString('ru-RU');
    el.textContent = prefix + formatted + suffix;
    if (progress < 1) requestAnimationFrame(tick);
    else el.dataset.countAnimated = '1';
  }
  requestAnimationFrame(tick);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initReveal);
  if (document.readyState !== 'loading') initReveal();
}
