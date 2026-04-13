(function () {
  const initStayGalleryCompat = () => {
    if (window.__acStayGalleryCompatInit) return true;

    const root = document.querySelector('[data-stay-root]');
    if (!root) return false;

    const opens = Array.from(root.querySelectorAll('[data-stay-open]'));
    const lightbox = root.querySelector('#stayLightbox');
    const image = root.querySelector('#stayLightboxImage');
    const closeBtn = root.querySelector('[data-stay-close]');
    const prevBtn = root.querySelector('[data-stay-prev]');
    const nextBtn = root.querySelector('[data-stay-next]');
    const track = root.querySelector('[data-stay-track]');
    const cards = Array.from(root.querySelectorAll('[data-stay-card]'));
    const dots = Array.from(root.querySelectorAll('[data-stay-dot]'));
    const listPrev = root.querySelector('[data-stay-list-prev]');
    const listNext = root.querySelector('[data-stay-list-next]');

    let mediaIndex = 0;
    let listIndex = 0;

    const renderLightbox = () => {
      if (!image || !opens.length) return;
      const item = opens[mediaIndex];
      image.src = item.getAttribute('data-stay-src') || '';
      image.alt = item.getAttribute('data-stay-alt') || '';
    };

    const openAt = (next) => {
      if (!lightbox || !opens.length) return;
      mediaIndex = (next + opens.length) % opens.length;
      renderLightbox();
      window.acTrack?.('stay_photo_open', { index: mediaIndex, src: image?.src || '' });
      lightbox.showModal();
    };

    const shiftLightbox = (delta) => {
      if (opens.length <= 1) return;
      mediaIndex = (mediaIndex + delta + opens.length) % opens.length;
      renderLightbox();
      window.acTrack?.('stay_photo_open', { index: mediaIndex, src: image?.src || '' });
    };

    const closeLightbox = () => lightbox?.close();

    const syncDots = (active) => {
      dots.forEach((dot, i) => {
        dot.classList.toggle('bg-[#ff8b1f]', i === active);
        dot.classList.toggle('bg-slate-300', i !== active);
      });
    };

    const scrollListTo = (next, smooth = true) => {
      if (!(track && cards.length)) return;
      listIndex = (next + cards.length) % cards.length;
      track.scrollTo({
        left: cards[listIndex].offsetLeft - 8,
        behavior: smooth ? 'smooth' : 'auto',
      });
      syncDots(listIndex);
    };

    const syncFromListScroll = () => {
      if (!(track && cards.length)) return;
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
      listIndex = nearest;
      syncDots(listIndex);
    };

    opens.forEach((node, i) => {
      node.addEventListener('click', () => openAt(i));
    });

    prevBtn?.addEventListener('click', () => shiftLightbox(-1));
    nextBtn?.addEventListener('click', () => shiftLightbox(1));
    closeBtn?.addEventListener('click', closeLightbox);

    listPrev?.addEventListener('click', () => scrollListTo(listIndex - 1));
    listNext?.addEventListener('click', () => scrollListTo(listIndex + 1));

    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        scrollListTo(Number(dot.getAttribute('data-stay-dot-index') || '0'));
      });
    });

    track?.addEventListener('scroll', syncFromListScroll, { passive: true });

    lightbox?.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (!lightbox?.open) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') shiftLightbox(-1);
      if (event.key === 'ArrowRight') shiftLightbox(1);
    });

    syncDots(0);
    window.__acStayGalleryCompatInit = true;
    return true;
  };

  const run = () => {
    if (initStayGalleryCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initStayGalleryCompat() || tries >= 10) {
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
