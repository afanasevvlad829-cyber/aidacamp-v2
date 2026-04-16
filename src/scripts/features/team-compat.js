(function () {
  const initTeamCompat = () => {
    if (window.__acTeamCompatInit) return true;

    const root = document.querySelector('[data-team-root]');
    if (!root) return false;

    const slots = Array.from(root.querySelectorAll('[data-team-slot]'));
    const prev = root.querySelector('[data-team-prev]');
    const next = root.querySelector('[data-team-next]');
    const payloadNode = root.querySelector('[data-team-carousel-payload]');
    const payload = payloadNode ? JSON.parse(payloadNode.textContent || '[]') : [];

    const mobileTrack = root.querySelector('[data-team-mobile-track]');
    const mobileCards = Array.from(root.querySelectorAll('[data-team-mobile-card]'));
    const mobileDots = Array.from(root.querySelectorAll('[data-team-mobile-dot]'));
    const mobilePrev = root.querySelector('[data-team-mobile-prev]');
    const mobileNext = root.querySelector('[data-team-mobile-next]');

    let desktopOffset = 0;
    let mobileIndex = 0;

    const renderSlot = (slot, item) => {
      if (!(slot && item)) return;
      slot.innerHTML = `
        <img src="${item.src}" alt="${item.title}" loading="lazy" class="mx-auto h-20 w-20 rounded-full border border-slate-200 object-cover" />
        <h3 class="mt-4 text-center text-[32px] font-semibold text-slate-900">${item.title}</h3>
        ${item.role ? `<p class="mt-2 text-center text-[15px] font-semibold text-slate-500">${item.role}</p>` : ''}
        <p class="mt-2 text-center text-[15px] leading-[1.55] text-slate-600">${item.text}</p>
      `;
    };

    const renderDesktop = () => {
      if (!(payload.length && slots.length)) return;
      slots.forEach((slot, i) => {
        const idx = (desktopOffset + i) % payload.length;
        renderSlot(slot, payload[idx]);
      });
    };

    const syncMobileDots = (active) => {
      mobileDots.forEach((dot, i) => {
        dot.classList.toggle('bg-[#ff8b1f]', i === active);
        dot.classList.toggle('bg-slate-300', i !== active);
      });
    };

    const goMobile = (nextIndex, smooth = true) => {
      if (!(mobileTrack && mobileCards.length)) return;
      mobileIndex = (nextIndex + mobileCards.length) % mobileCards.length;
      mobileTrack.scrollTo({
        left: mobileCards[mobileIndex].offsetLeft - 8,
        behavior: smooth ? 'smooth' : 'auto',
      });
      syncMobileDots(mobileIndex);
    };

    const syncMobileFromScroll = () => {
      if (!(mobileTrack && mobileCards.length)) return;
      const left = mobileTrack.scrollLeft;
      let nearest = 0;
      let minDelta = Number.POSITIVE_INFINITY;
      mobileCards.forEach((card, i) => {
        const delta = Math.abs(card.offsetLeft - left);
        if (delta < minDelta) {
          minDelta = delta;
          nearest = i;
        }
      });
      mobileIndex = nearest;
      syncMobileDots(mobileIndex);
    };

    prev?.addEventListener('click', () => {
      if (!payload.length) return;
      desktopOffset = (desktopOffset - 1 + payload.length) % payload.length;
      renderDesktop();
      window.acTrack?.('team_carousel_prev', { offset: desktopOffset });
    });

    next?.addEventListener('click', () => {
      if (!payload.length) return;
      desktopOffset = (desktopOffset + 1) % payload.length;
      renderDesktop();
      window.acTrack?.('team_carousel_next', { offset: desktopOffset });
    });

    mobilePrev?.addEventListener('click', () => goMobile(mobileIndex - 1));
    mobileNext?.addEventListener('click', () => goMobile(mobileIndex + 1));
    mobileDots.forEach((dot) => {
      dot.addEventListener('click', () => {
        goMobile(Number(dot.getAttribute('data-team-mobile-dot-index') || '0'));
      });
    });
    mobileTrack?.addEventListener('scroll', syncMobileFromScroll, { passive: true });

    renderDesktop();
    syncMobileDots(0);

    const bookModal = root.querySelector('#teamBookModal');
    const bookOpen = root.querySelector('[data-book-open]');
    const bookClose = root.querySelector('[data-team-book-close]');
    const closeBookModal = () => bookModal?.close();

    bookOpen?.addEventListener('click', () => {
      bookModal?.showModal();
      window.acTrack?.('team_book_open', { source: 'team_block' });
    });
    bookClose?.addEventListener('click', closeBookModal);
    bookModal?.addEventListener('click', (event) => {
      if (event.target === bookModal) closeBookModal();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && bookModal?.open) closeBookModal();
    });

    window.__acTeamCompatInit = true;
    return true;
  };

  const run = () => {
    if (initTeamCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initTeamCompat() || tries >= 10) {
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
