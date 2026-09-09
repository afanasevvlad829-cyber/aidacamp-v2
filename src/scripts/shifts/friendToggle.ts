// «Едете с другом?» — раскрывающийся блок со скидками и мерчем.
// Атрибуты уникальные (не data-toggle-root/data-toggle) — Footer.astro вешает свой
// обработчик на ЛЮБОЙ [data-toggle-root] на странице, коллизия гасила клик (25.07.2026).
export function initFriendToggle(): void {
  document.querySelectorAll<HTMLElement>('[data-friend-toggle-root]').forEach((root) => {
    const btn = root.querySelector<HTMLButtonElement>('[data-friend-toggle]');
    const panel = root.querySelector<HTMLElement>('[data-friend-toggle-panel]');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      panel.classList.toggle('hidden', expanded);
      const chevron = btn.querySelector<HTMLElement>('i[id="shifts-friend-chevron"]') || document.getElementById('shifts-friend-chevron');
      if (chevron) chevron.style.transform = expanded ? '' : 'rotate(180deg)';
    });
  });
}
