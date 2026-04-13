(function () {
  const initFooterTabs = () => {
    const root = document.querySelector('[data-footer-mobile-tabs]')?.parentElement;
    if (!root) return false;

    const tabs = Array.from(root.querySelectorAll('[data-footer-tab]'));
    const panels = Array.from(root.querySelectorAll('[data-footer-panel]'));
    if (!tabs.length || !panels.length) return false;

    const setActive = (tabName) => {
      tabs.forEach((tab) => {
        const active = (tab.getAttribute('data-footer-tab') || '') === tabName;
        tab.classList.toggle('bg-[#fff2e3]', active);
        tab.classList.toggle('border-[#ff8b1f]', active);
        tab.classList.toggle('text-[#ff8b1f]', active);
      });

      panels.forEach((panel) => {
        const show = (panel.getAttribute('data-footer-panel') || '') === tabName;
        panel.classList.toggle('hidden', !show);
      });
    };

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        setActive(tab.getAttribute('data-footer-tab') || 'docs');
      });
    });

    setActive('docs');
    window.__acFooterTabsInit = true;
    return true;
  };

  const runWithRetry = () => {
    if (initFooterTabs()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initFooterTabs() || tries >= 10) {
        clearInterval(timer);
      }
    }, 100);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runWithRetry, { once: true });
  } else {
    runWithRetry();
  }
})();
