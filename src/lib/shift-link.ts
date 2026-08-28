/**
 * shiftLinkHtml(shiftId, label) → inline HTML кнопка, которая открывает
 * ShiftModal (таб «Программа») с описанием указанной смены.
 *
 * Использование в `list:` секций LandingTwoCol / articles:
 *   `${shiftLinkHtml('shift-3', 'Смена 3')} — 13 дней, 89 400 ₽`
 *
 * `data-shift-link` подхватывается собственным document click-делегатом
 * в `src/scripts/shift-modal.ts` (initShiftModal()), который сразу вызывает
 * open(shiftId, 'description') — без промежуточного CustomEvent.
 *
 * shiftId ДОЛЖЕН существовать в allShifts (src/data/shifts.ts) — иначе open()
 * молча ничего не делает. Не используй id завершённых смен (shift-1, shift-2,
 * shift-2-1, shift-2-2) — их больше нет в allShifts.
 */

export function shiftLinkHtml(shiftId: string, label: string): string {
  return `<button type="button" data-shift-link="${shiftId}" class="underline decoration-orange-300 underline-offset-2 hover:decoration-orange-500 hover:text-orange-600 transition-colors font-semibold">${label}</button>`;
}
