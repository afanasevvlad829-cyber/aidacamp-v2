(function () {
  const initFloatingContacts = () => {
    const root = document.querySelector('[data-floating-contacts]');
    if (!root) return false;

    const panel = root.querySelector('[data-floating-panel]');
    const fab = root.querySelector('[data-floating-fab]');
    const hero = document.getElementById('hero');

    let visible = false;
    let open = false;

    const render = () => {
      root.style.display = visible ? '' : 'none';
      if (panel) panel.setAttribute('data-open', String(open && visible));
    };

    const setVisible = (value) => {
      visible = value;
      if (!visible) open = false;
      render();
    };

    const setOpen = (value) => {
      open = value;
      render();
    };

    if (hero) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => setVisible(!entry.isIntersecting));
      }, { threshold: 0.2 });
      observer.observe(hero);
    } else {
      setVisible(true);
    }

    if (fab) {
      fab.addEventListener('click', (event) => {
        event.stopPropagation();
        setOpen(!open);
        if (window.acTrack) {
          window.acTrack('floating_contacts_toggle', { open: !open });
        }
      });
    }

    document.addEventListener('click', (event) => {
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    });

    render();
    window.__acFloatingContactsInit = true;
    return true;
  };

  const run = () => {
    if (initFloatingContacts()) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (initFloatingContacts() || tries >= 10) {
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
