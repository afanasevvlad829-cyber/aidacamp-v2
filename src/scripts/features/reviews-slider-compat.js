(function () {
  const initReviewsSliderCompat = () => {
    if (window.__acReviewsSliderCompatInit) return true;

    const root = document.querySelector('[data-reviews-root]');
    if (!root) return false;

    const track = root.querySelector('[data-reviews-track]');
    const cards = Array.from(root.querySelectorAll('[data-review-card]'));
    const dots = Array.from(root.querySelectorAll('[data-reviews-dot]'));
    const prev = root.querySelector('[data-reviews-prev]');
    const next = root.querySelector('[data-reviews-next]');

    if (!(track && cards.length)) return false;

    let index = 0;

    const syncDots = (active) => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('bg-[#ff8b1f]', i === active);
        dot.classList.toggle('bg-slate-300', i !== active);
      });
    };

    const scrollToIndex = (nextIndex, smooth = true) => {
      if (!cards.length) return;
      index = (nextIndex + cards.length) % cards.length;
      track.scrollTo({
        left: cards[index].offsetLeft - 4,
        behavior: smooth ? 'smooth' : 'auto',
      });
      syncDots(index);
    };

    const syncFromScroll = () => {
      const left = track.scrollLeft;
      let nearest = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      cards.forEach((card, i) => {
        const delta = Math.abs(card.offsetLeft - left);
        if (delta < minDelta) {
          minDelta = delta;
          nearest = i;
        }
      });
      index = nearest;
      syncDots(index);
    };

    prev?.addEventListener('click', () => scrollToIndex(index - 1));
    next?.addEventListener('click', () => scrollToIndex(index + 1));
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        scrollToIndex(Number(dot.getAttribute('data-reviews-dot-index') || '0'));
      });
    });
    track.addEventListener('scroll', syncFromScroll, { passive: true });

    syncDots(0);
    window.__acReviewsSliderCompatInit = true;
    return true;
  };

  const run = () => {
    if (initReviewsSliderCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initReviewsSliderCompat() || tries >= 10) {
        clearInterval(timer);
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
