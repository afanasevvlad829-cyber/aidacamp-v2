(function () {
  const initFaqFilterCompat = () => {
    if (window.__acFaqFilterCompatInit) return true;

    const root = document.querySelector('[data-faq-root]') || document.getElementById('faq');
    if (!root) return false;

    const buttons = Array.from(root.querySelectorAll('[data-faq-filter-btn]'));
    const panels = Array.from(root.querySelectorAll('[data-faq-group-panel]'));
    if (!buttons.length || !panels.length) return false;

    const setGroup = (group) => {
      buttons.forEach((btn) => {
        const active = (btn.dataset.faqGroup || '') === group;
        btn.classList.toggle('border-[#ff8b1f]', active);
        btn.classList.toggle('bg-[#fff2e3]', active);
        btn.classList.toggle('text-[#ff8b1f]', active);
        btn.classList.toggle('border-slate-200', !active);
        btn.classList.toggle('bg-white', !active);
        btn.classList.toggle('text-slate-600', !active);
      });

      panels.forEach((panel) => {
        panel.classList.toggle('hidden', panel.getAttribute('data-faq-group-panel') !== group);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const group = btn.dataset.faqGroup || '';
        setGroup(group);
        window.acTrack?.('faq_filter', { filter: group });
      });
    });

    window.__acFaqFilterCompatInit = true;
    return true;
  };

  const run = () => {
    if (initFaqFilterCompat()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initFaqFilterCompat() || tries >= 10) {
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
