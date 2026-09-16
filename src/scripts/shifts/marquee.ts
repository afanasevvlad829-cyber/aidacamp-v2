// ═══════════════════════════════════════════════════════════
// INFINITE MARQUEE — карусель карточек смен (мобильный drag, dot-индикаторы)
// ═══════════════════════════════════════════════════════════
export function initShiftsMarquee(): void {
  const vp = document.querySelector<HTMLElement>('[data-shifts-marquee-vp]');
  const track = document.querySelector<HTMLElement>('[data-shifts-marquee-track]');
  if (!vp || !track) return;
  if (track.dataset.mqReady) return;
  track.dataset.mqReady = '1';

  const origItems = Array.from(track.querySelectorAll<HTMLElement>('.shifts-mq-item'));
  if (!origItems.length) return;

  // Mobile initial scroll to active shift (index from data-carousel-initial)
  if (window.innerWidth < 768) {
    const initialIdx = parseInt(track.dataset.carouselInitial || '0', 10);
    if (initialIdx > 0 && origItems[initialIdx]) {
      requestAnimationFrame(() => {
        const item = origItems[initialIdx];
        const vw = window.innerWidth;
        track.scrollLeft = item.offsetLeft - (vw - item.offsetWidth) / 2;
      });
    }
  }

  // ── Dot-индикаторы ───────────────────────────────────────
  const dotsContainer = document.querySelector<HTMLElement>('[data-shifts-dots]');
  const dotEls: HTMLElement[] = [];
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    origItems.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'block h-2 rounded-full transition-all duration-300 ' + (i === 0 ? 'w-6 bg-primary' : 'w-2 bg-border');
      d.setAttribute('aria-hidden', 'true');
      dotsContainer.appendChild(d);
      dotEls.push(d);
    });

    const dotObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && (entry.intersectionRatio ?? 0) > 0.5) {
          const idx = origItems.indexOf(entry.target as HTMLElement);
          if (idx < 0) return;
          dotEls.forEach((d, di) => {
            const active = di === idx;
            d.className = 'block h-2 rounded-full transition-all duration-300 ' + (active ? 'w-6 bg-primary' : 'w-2 bg-border');
          });
        }
      });
    }, { root: vp, threshold: 0.5 });

    origItems.forEach((item) => dotObserver.observe(item));
  }

  // ── Mouse drag ───────────────────────────────────────────
  let isDragging = false;
  let dragStartX = 0;
  let dragScrollL = 0;

  track.addEventListener('mousedown', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    isDragging = true;
    dragStartX = e.pageX - track.offsetLeft;
    dragScrollL = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    track.scrollLeft = dragScrollL - (e.pageX - track.offsetLeft - dragStartX);
  });
  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
  });
}
