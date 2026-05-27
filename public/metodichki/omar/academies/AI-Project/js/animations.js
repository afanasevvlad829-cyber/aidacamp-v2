/* === Лагерь программирования Москва 2026: тонкие анимации === */
(() => {
  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  const observeAll = (root = document) =>
    root.querySelectorAll('.reveal, .project-card, .tool-card, .step, .pd-block')
        .forEach(el => { if (!el.classList.contains('is-visible')) io.observe(el); });
  observeAll();

  // Re-observe when project grid re-renders
  const grid = document.getElementById('projectGrid');
  if (grid) {
    new MutationObserver(() => observeAll(grid)).observe(grid, { childList: true });
  }

  // Subtle tilt for the user form
  const tilt = document.querySelector('.tilt');
  if (tilt && matchMedia('(pointer:fine)').matches) {
    tilt.addEventListener('mousemove', (ev) => {
      const r = tilt.getBoundingClientRect();
      const x = (ev.clientX - r.left) / r.width - 0.5;
      const y = (ev.clientY - r.top) / r.height - 0.5;
      tilt.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
    });
    tilt.addEventListener('mouseleave', () => { tilt.style.transform = ''; });
  }

  // Parallax for hero blobs
  const blobs = document.querySelectorAll('.hero .blob');
  if (blobs.length) {
    window.addEventListener('mousemove', (ev) => {
      const x = (ev.clientX / innerWidth - 0.5) * 20;
      const y = (ev.clientY / innerHeight - 0.5) * 20;
      blobs.forEach((b, i) => {
        const k = (i + 1) * 0.6;
        b.style.translate = `${x * k}px ${y * k}px`;
      });
    });
  }

  // Confetti-ish sparkle on primary button click
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-primary');
    if (!btn) return;
    for (let i = 0; i < 10; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      s.style.setProperty('--dy', (Math.random() * -120 - 20) + 'px');
      s.style.background = ['#7c5cff', '#22c1c3', '#ff8a3d', '#ff5ea8'][i % 4];
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    }
  });
})();
