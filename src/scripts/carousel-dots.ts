/** Initialize IntersectionObserver-based carousel dots tracking */
export function initCarouselDots(
  trackSelector: string,
  dotSelector: string,
  activeClass = 'bg-primary-light',
  inactiveClass = 'bg-slate-300',
  threshold = 0.6,
): void {
  const items = document.querySelectorAll(trackSelector);
  const dots = document.querySelectorAll(dotSelector);
  if (!items.length || !dots.length) return;

  const scrollParent = items[0]?.parentElement;
  if (!scrollParent) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = Array.from(items).indexOf(entry.target as HTMLElement);
        if (idx < 0 || idx >= dots.length) return;
        const dot = dots[idx];
        if (entry.isIntersecting) {
          dot.classList.remove(inactiveClass);
          dot.classList.add(activeClass);
        } else {
          dot.classList.remove(activeClass);
          dot.classList.add(inactiveClass);
        }
      });
    },
    { root: scrollParent, threshold },
  );

  items.forEach((item) => observer.observe(item));
}
