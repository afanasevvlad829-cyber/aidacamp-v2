export function initFaqAccordion(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-faq-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-faq-item]') as HTMLElement;
      const answer = item.querySelector<HTMLElement>('[data-faq-answer]');
      const icon = btn.querySelector<HTMLElement>('[data-faq-icon]');
      const isOpen = btn.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        answer?.classList.remove('is-open');
        if (icon) icon.style.transform = '';
        btn.setAttribute('aria-expanded', 'false');
      } else {
        answer?.classList.add('is-open');
        if (icon) icon.style.transform = 'rotate(45deg)';
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
