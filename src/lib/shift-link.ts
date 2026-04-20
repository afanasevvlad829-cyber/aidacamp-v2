/**
 * Helper для вставки кликабельной ссылки на смену в HTML-строку (например, в
 * `list: [...]` секций LandingTwoCol, где элемент рендерится через set:html).
 *
 * Эквивалент <ShiftLink shiftId={id}>{text}</ShiftLink>, но в виде строки.
 *
 * Использование:
 *   import { shiftLinkHtml } from '../lib/shift-link';
 *   const list = [
 *     `${shiftLinkHtml('shift-2-1', 'Смена 2.1')} — 7 дней, 10–16 июня — 48 000 ₽`,
 *   ];
 *
 * Делегированный click-handler (GlobalShiftLinkHandler.astro) ловит клик
 * по [data-shift-link] и диспатчит shift-modal-open.
 */
export function shiftLinkHtml(shiftId: string, text: string, title = 'Подробнее о смене'): string {
  const safeText = String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeId = String(shiftId).replace(/"/g, '&quot;');
  const safeTitle = String(title).replace(/"/g, '&quot;');
  return `<button type="button" data-shift-link data-shift-id="${safeId}" title="${safeTitle}" class="inline font-semibold text-orange-700 underline decoration-orange-300 decoration-dotted underline-offset-[3px] hover:text-orange-800 hover:decoration-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300/40 rounded transition-colors">${safeText}</button>`;
}
