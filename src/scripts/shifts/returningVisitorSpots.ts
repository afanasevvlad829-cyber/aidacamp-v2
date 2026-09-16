// Returning visitor: показываем на 1 место меньше для смен 1, 2, 2.1, 2.2
export function initReturningVisitorSpots(): void {
  const ADJUSTABLE = new Set(['shift-1', 'shift-2', 'shift-2-1', 'shift-2-2']);
  const KEY = 'ac_rv';

  function spotsText(n: number): string {
    if (n === 1) return 'Осталось 1 место';
    if (n >= 2 && n <= 4) return `Осталось ${n} места`;
    return `Осталось ${n} мест`;
  }

  const isReturning = !!localStorage.getItem(KEY);
  if (!isReturning) {
    localStorage.setItem(KEY, '1');
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-shift-card][data-shift-id]').forEach((card) => {
    const shiftId = card.dataset.shiftId ?? '';
    if (!ADJUSTABLE.has(shiftId)) return;

    const base = parseInt(card.dataset.shiftSpots ?? '0', 10);
    if (!base || base <= 1) return;
    const adj = base - 1;

    // Баннер ближайшей смены
    const nearestSpan = card.querySelector<HTMLElement>('[data-spots-nearest]');
    if (nearestSpan) nearestSpan.textContent = spotsText(adj);

    // Счётчик занятости
    const countEl = card.querySelector<HTMLElement>('[data-count-to]');
    if (countEl && parseInt(countEl.dataset.countTo ?? '0', 10) === base) {
      countEl.textContent = String(adj);
      countEl.dataset.countTo = String(adj);
    }

    // Пилюля (только если содержала «Осталось»)
    const pill = card.querySelector<HTMLElement>('[data-spots-pill]');
    if (pill) pill.textContent = `Осталось ${adj}`;
  });
}
