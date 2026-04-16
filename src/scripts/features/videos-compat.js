(function () {
  const initVideosCompat = () => {
    if (window.__acVideosCompatInit) return true;

    const root = document.querySelector('[data-videos-root]');
    if (!root) return false;

    const modal = document.getElementById('videoModal');
    const frame = document.getElementById('videoFrame');
    const closeBtn = root.querySelector('[data-video-close]');
    const prevBtn = root.querySelector('[data-video-prev]');
    const nextBtn = root.querySelector('[data-video-next]');
    const carousel = root.querySelector('[data-video-carousel]');
    const cards = Array.from(root.querySelectorAll('[data-video-card]'));
    const openMain = root.querySelector('[data-video-open-main]');
    const mainImage = root.querySelector('[data-video-main-image]');
    const mainTitle = root.querySelector('[data-video-main-title]');
    const thumbs = Array.from(root.querySelectorAll('[data-video-thumb]'));

    let index = 0;
    let focusBack = null;

    const openVideo = (url, title = '') => {
      if (!(modal && frame && url)) return;
      frame.src = url;
      window.acTrack?.('video_play', { url });
      window.acTrack?.('video_open', { url, title });
      modal.showModal();
    };

    const scrollToIndex = (nextIndex) => {
      if (!(carousel && cards.length)) return;
      index = (nextIndex + cards.length) % cards.length;
      const card = cards[index];
      carousel.scrollTo({ left: card.offsetLeft - 8, behavior: 'smooth' });
    };

    const syncIndexFromScroll = () => {
      if (!(carousel && cards.length)) return;
      const left = carousel.scrollLeft;
      let nearest = 0;
      let delta = Number.POSITIVE_INFINITY;
      cards.forEach((card, i) => {
        const current = Math.abs(card.offsetLeft - 8 - left);
        if (current < delta) {
          delta = current;
          nearest = i;
        }
      });
      index = nearest;
    };

    const closeModal = () => {
      if (frame) frame.src = '';
      modal?.close();
      if (focusBack instanceof HTMLElement) focusBack.focus();
    };

    prevBtn?.addEventListener('click', () => scrollToIndex(index - 1));
    nextBtn?.addEventListener('click', () => scrollToIndex(index + 1));
    carousel?.addEventListener('scroll', syncIndexFromScroll, { passive: true });

    root.querySelectorAll('[data-video-open]').forEach((node) => {
      node.addEventListener('click', () => {
        const url = node.getAttribute('data-video-open');
        const title = node.getAttribute('data-video-title') || '';
        focusBack = node;
        openVideo(url, title);
      });
    });

    openMain?.addEventListener('click', () => {
      const url = openMain.getAttribute('data-video-url');
      const title = openMain.getAttribute('data-video-title') || '';
      focusBack = openMain;
      openVideo(url, title);
    });

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const cover = thumb.getAttribute('data-video-cover') || '';
        const title = thumb.getAttribute('data-video-title') || '';
        const url = thumb.getAttribute('data-video-url') || '';
        if (mainImage) {
          mainImage.src = cover;
          mainImage.alt = title;
        }
        if (mainTitle) {
          mainTitle.textContent = title;
        }
        if (openMain) {
          openMain.setAttribute('data-video-url', url);
          openMain.setAttribute('data-video-title', title);
        }
      });
    });

    closeBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' && !modal?.open) scrollToIndex(index - 1);
      if (event.key === 'ArrowRight' && !modal?.open) scrollToIndex(index + 1);
      if (modal?.open && event.key === 'Escape') closeModal();
    });

    window.__acVideosCompatInit = true;
    return true;
  };

  const run = () => {
    if (initVideosCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initVideosCompat() || tries >= 10) {
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
