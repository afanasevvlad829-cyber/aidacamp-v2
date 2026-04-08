(function () {
  const initGalleryCompat = () => {
    if (window.__acGalleryCompatInit) return true;

    const root = document.querySelector('[data-gallery-root]');
    if (!root) return false;

    const filterButtons = Array.from(root.querySelectorAll('[data-gallery-filter-btn]'));
    const categories = Array.from(root.querySelectorAll('[data-gallery-category]'));
    const mobileCategories = Array.from(root.querySelectorAll('[data-gallery-mobile-category]'));
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImage = root.querySelector('#galleryLightboxImage');
    const closeBtn = root.querySelector('[data-gallery-close]');
    const prevBtn = root.querySelector('[data-gallery-prev]');
    const nextBtn = root.querySelector('[data-gallery-next]');

    let activeList = [];
    let activeIndex = 0;
    const mobileIndexMap = new Map();

    const getFilterList = (filter) => (
      Array.from(root.querySelectorAll(`[data-gallery-open][data-gallery-filter="${filter}"]`))
    );

    const renderLightbox = () => {
      if (!lightboxImage || !activeList.length) return;
      const active = activeList[activeIndex];
      if (!active) return;
      lightboxImage.src = active.getAttribute('data-gallery-src') || '';
      lightboxImage.alt = active.getAttribute('data-gallery-alt') || '';
    };

    const syncMobileCategory = (filter, index, smooth = true) => {
      const group = root.querySelector(`[data-gallery-mobile-category="${filter}"]`);
      if (!group) return;

      const thumbs = Array.from(group.querySelectorAll('[data-gallery-mobile-thumb]'));
      if (!thumbs.length) return;

      const normalized = (index + thumbs.length) % thumbs.length;
      mobileIndexMap.set(filter, normalized);

      const current = thumbs[normalized];
      const src = current.getAttribute('data-gallery-src') || '';
      const alt = current.getAttribute('data-gallery-alt') || '';

      const mainImage = group.querySelector('[data-gallery-mobile-main-image]');
      const mainOpen = group.querySelector('[data-gallery-mobile-main-open]');
      if (mainImage) {
        mainImage.src = src;
        mainImage.alt = alt;
      }
      if (mainOpen) {
        mainOpen.setAttribute('data-gallery-mobile-index', String(normalized));
        mainOpen.setAttribute('data-gallery-src', src);
        mainOpen.setAttribute('data-gallery-alt', alt);
      }

      thumbs.forEach((thumb, i) => {
        thumb.classList.toggle('border-[#ff8b1f]', i === normalized);
        thumb.classList.toggle('border-slate-200', i !== normalized);
      });

      Array.from(group.querySelectorAll('[data-gallery-mobile-dot]')).forEach((dot, i) => {
        dot.classList.toggle('bg-[#ff8b1f]', i === normalized);
        dot.classList.toggle('bg-slate-300', i !== normalized);
      });

      if (smooth) {
        // no-op placeholder for behavior parity flag
      }
    };

    const applyFilter = (filter) => {
      window.acTrack?.('gallery_filter', { filter });

      filterButtons.forEach((btn) => {
        const active = btn.getAttribute('data-gallery-filter') === filter;
        btn.classList.toggle('bg-[#ff8b1f]', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('bg-slate-100', !active);
        btn.classList.toggle('text-slate-700', !active);
      });

      categories.forEach((node) => {
        node.classList.toggle('hidden', node.getAttribute('data-gallery-category') !== filter);
      });
      mobileCategories.forEach((node) => {
        node.classList.toggle('hidden', node.getAttribute('data-gallery-mobile-category') !== filter);
      });

      activeList = getFilterList(filter);
      activeIndex = 0;
      syncMobileCategory(filter, mobileIndexMap.get(filter) ?? 0, false);
    };

    const openItem = (node) => {
      if (!(lightbox && lightboxImage && node)) return;
      const filter = node.getAttribute('data-gallery-filter') || '';
      activeList = getFilterList(filter);
      const idx = activeList.indexOf(node);
      activeIndex = idx >= 0 ? idx : 0;
      renderLightbox();
      window.acTrack?.('gallery_open', { src: lightboxImage.src, alt: lightboxImage.alt });
      window.acTrack?.('photo_open', { src: lightboxImage.src, alt: lightboxImage.alt });
      lightbox.showModal();
    };

    const shiftLightbox = (delta) => {
      if (activeList.length <= 1) return;
      activeIndex = (activeIndex + delta + activeList.length) % activeList.length;
      renderLightbox();
      window.acTrack?.('photo_open', { src: lightboxImage?.src || '', alt: lightboxImage?.alt || '' });
    };

    const closeLightbox = () => lightbox?.close();

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => applyFilter(btn.getAttribute('data-gallery-filter') || ''));
    });

    root.querySelectorAll('[data-gallery-open]').forEach((node) => {
      node.addEventListener('click', () => openItem(node));
    });

    root.querySelectorAll('[data-gallery-mobile-thumb]').forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const filter = thumb.getAttribute('data-gallery-mobile-filter') || '';
        const idx = Number(thumb.getAttribute('data-gallery-mobile-index') || '0');
        syncMobileCategory(filter, idx);
      });
    });

    root.querySelectorAll('[data-gallery-mobile-prev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-gallery-mobile-filter') || '';
        const idx = mobileIndexMap.get(filter) ?? 0;
        syncMobileCategory(filter, idx - 1);
      });
    });

    root.querySelectorAll('[data-gallery-mobile-next]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-gallery-mobile-filter') || '';
        const idx = mobileIndexMap.get(filter) ?? 0;
        syncMobileCategory(filter, idx + 1);
      });
    });

    root.querySelectorAll('[data-gallery-mobile-dot]').forEach((dot) => {
      dot.addEventListener('click', () => {
        const filter = dot.getAttribute('data-gallery-mobile-filter') || '';
        const idx = Number(dot.getAttribute('data-gallery-mobile-dot-index') || '0');
        syncMobileCategory(filter, idx);
      });
    });

    closeBtn?.addEventListener('click', closeLightbox);
    prevBtn?.addEventListener('click', () => shiftLightbox(-1));
    nextBtn?.addEventListener('click', () => shiftLightbox(1));

    lightbox?.addEventListener('click', (event) => {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (event) => {
      if (!lightbox?.open) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') shiftLightbox(-1);
      if (event.key === 'ArrowRight') shiftLightbox(1);
    });

    const defaultFilter = root.getAttribute('data-default-filter') || filterButtons[0]?.getAttribute('data-gallery-filter') || '';
    if (defaultFilter) applyFilter(defaultFilter);

    window.__acGalleryCompatInit = true;
    return true;
  };

  const run = () => {
    if (initGalleryCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initGalleryCompat() || tries >= 10) {
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
