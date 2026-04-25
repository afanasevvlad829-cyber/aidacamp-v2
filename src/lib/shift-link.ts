/**
 * shiftLinkHtml(shiftId, label) → inline HTML кнопка, которая открывает
 * ShiftInfoModal с описанием указанной смены.
 *
 * Использование в `list:` секций LandingTwoCol / articles:
 *   `${shiftLinkHtml('shift-2-1', 'Смена 2.1')} — 7 дней, 48 000 ₽`
 *
 * Глобальный делегированный обработчик подхватывает `data-shift-link`
 * и диспатчит `CustomEvent('shift-modal-open', { shiftId, tab: 'description' })`.
 * См. `src/scripts/shift-modal.ts` — там же слушатель `shift-modal-open`.
 */

export function shiftLinkHtml(shiftId: string, label: string): string {
  return `<button type="button" data-shift-link="${shiftId}" class="underline decoration-orange-300 underline-offset-2 hover:decoration-orange-500 hover:text-orange-600 transition-colors font-semibold">${label}</button>`;
}
