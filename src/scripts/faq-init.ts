import { trackGoal } from './analytics';

export function initFaq() {
  const filterBtns = document.querySelectorAll<HTMLButtonElement>('[data-faq-filter-btn]');
  const panels = document.querySelectorAll<HTMLElement>('[data-faq-group-panel]');

  // Category filter tabs
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => {
        b.classList.remove('border-primary-light', 'bg-primary-soft', 'text-primary-text');
        b.classList.add('border-border', 'bg-card', 'text-body-muted');
      });
      btn.classList.remove('border-border', 'bg-card', 'text-body-muted');
      btn.classList.add('border-primary-light', 'bg-primary-soft', 'text-primary-text');

      const group = btn.dataset.faqGroup;
      panels.forEach((p) => p.classList.toggle('hidden', p.dataset.faqGroupPanel !== group));
    });
  });

  // Accordion toggles
  document.querySelectorAll<HTMLButtonElement>('[data-faq-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('[data-faq-item]') as HTMLElement;
      const answer = item.querySelector<HTMLElement>('[data-faq-answer]')!;
      const icon = btn.querySelector<HTMLElement>('[data-faq-icon]')!;
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      if (isOpen) {
        answer.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        answer.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
        trackGoal('faq_open', { question: btn.querySelector('span')?.textContent || '' });
      }
    });
  });
}
