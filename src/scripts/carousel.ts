/**
 * Carousel dot-indicator через IntersectionObserver.
 *
 * Паттерн взят из Mentors.astro и Stay.astro:
 * - наблюдает карточки внутри скролл-трека
 * - при появлении карточки активирует соответствующую точку
 *
 * Активная точка: w-6 + bg-[var(--color-primary,#ec7c00)]
 * Неактивная:     w-2 + bg-slate-300
 */

/**
 * @param trackId  — id горизонтального скролл-контейнера с карточками
 * @param dotsId   — id контейнера с dot-элементами (span/button)
 */
export function initCarousel(trackId: string, dotsId: string): void {
  const track = document.getElementById(trackId);
  const dotsContainer = document.getElementById(dotsId);
  if (!track || !dotsContainer) return;

  const cards = Array.from(track.children) as HTMLElement[];
  const dots = Array.from(dotsContainer.children) as HTMLElement[];
  if (!cards.length || !dots.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const idx = cards.indexOf(entry.target as HTMLElement);
        if (idx < 0) return;
        dots.forEach((dot, di) => {
          const active = di === idx;
          dot.classList.toggle('bg-[var(--color-primary,#ec7c00)]', active);
          dot.classList.toggle('w-6', active);
          dot.classList.toggle('bg-slate-300', !active);
          dot.classList.toggle('w-2', !active);
          // Поддержка aria-current если задан
          if (dot.hasAttribute('aria-current')) {
            dot.setAttribute('aria-current', active ? 'true' : 'false');
          }
        });
      });
    },
    { root: track, threshold: 0.6 },
  );

  cards.forEach((card) => observer.observe(card));
}
