/**
 * Клиентская логика промокода для всех форм заявки.
 *
 * Один инициализатор на страницу: находит каждый PromoField (data-promo-root),
 * вешает обработчик ввода, показывает плашку спецусловий и пересчитывает цену.
 * Введённый код запоминается на вкладке (sessionStorage) — человек, пришедший
 * по партнёрской ссылке, не должен вводить его заново в каждой форме.
 *
 * Значения промокодов берутся из src/data/promo.ts — единого источника.
 */
import {
  findPromo,
  normalizePromo,
  priceWithPromo,
  promoBenefitsLine,
  promoCrmNote,
  promoTitle,
  type Promo,
} from '../data/promo';

const SS_KEY = 'ac:promo';

/** Код, введённый в этой сессии (или пусто). Читают формы при отправке заявки. */
export function getStoredPromoCode(): string {
  try {
    return sessionStorage.getItem(SS_KEY) || '';
  } catch {
    return '';
  }
}

/** Промокод сессии как объект, либо null. */
export function getActivePromo(): Promo | null {
  return findPromo(getStoredPromoCode());
}

function storePromoCode(code: string): void {
  try {
    if (code) sessionStorage.setItem(SS_KEY, code);
    else sessionStorage.removeItem(SS_KEY);
  } catch {
    /* приватный режим — работаем без запоминания */
  }
}

/**
 * Примечание для CRM/Telegram по активному промокоду, либо ''.
 * priceRub — цена смены, если форма её знает: тогда в примечание попадёт
 * и итоговая сумма со скидкой, как это делает Колесо фортуны.
 */
export function promoNoteForLead(priceRub?: number): string {
  const promo = getActivePromo();
  return promo ? promoCrmNote(promo, priceRub) : '';
}

/**
 * Цена смены, объявленная в форме через [data-promo-price]. Число берём из
 * data-price, а если его нет — из текста элемента: в модалке брони цена
 * приходит уже отформатированной строкой «49 900 ₽», отдельного числа там нет.
 */
function formPrice(root: HTMLElement): { el: HTMLElement; price: number } | null {
  const form = root.closest('[data-promo-scope]') ?? root.parentElement ?? document.body;
  const el = form.querySelector<HTMLElement>('[data-promo-price]');
  if (!el) return null;
  const raw = el.dataset.price || el.textContent || '';
  const price = parseInt(raw.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(price) && price > 0 ? { el, price } : null;
}

function render(root: HTMLElement, raw: string): void {
  const okBox = root.querySelector<HTMLElement>('[data-promo-ok]');
  const badBox = root.querySelector<HTMLElement>('[data-promo-bad]');
  const titleEl = root.querySelector<HTMLElement>('[data-promo-ok-title]');
  const benefitsEl = root.querySelector<HTMLElement>('[data-promo-ok-benefits]');
  const priceEl = root.querySelector<HTMLElement>('[data-promo-ok-price]');

  const code = normalizePromo(raw);
  const promo = findPromo(code);

  // Пустое поле — ни ошибки, ни плашки: человек ещё ничего не ввёл.
  if (!code) {
    if (okBox) okBox.hidden = true;
    if (badBox) badBox.hidden = true;
    storePromoCode('');
    return;
  }

  if (!promo) {
    if (okBox) okBox.hidden = true;
    // Ошибку показываем только когда ввод похож на законченный код —
    // иначе она мигает на каждой букве, пока человек печатает.
    if (badBox) badBox.hidden = code.length < 4;
    storePromoCode('');
    return;
  }

  storePromoCode(promo.code);
  if (badBox) badBox.hidden = true;
  if (titleEl) titleEl.textContent = promoTitle(promo);
  if (benefitsEl) benefitsEl.textContent = promoBenefitsLine(promo) + '.';

  const found = formPrice(root);
  if (found && promo.discountPct > 0 && priceEl) {
    const final = priceWithPromo(found.price, promo);
    priceEl.textContent = `Стоимость смены: ${final.toLocaleString('ru')} ₽ вместо ${found.price.toLocaleString('ru')} ₽`;
    // hidden, а не класс: у попапа чат-бота своя вёрстка на inline-стилях,
    // класс .hidden там ничего не значит.
    priceEl.hidden = false;
    priceEl.style.display = '';
  } else if (priceEl) {
    priceEl.textContent = '';
    priceEl.hidden = true;
    priceEl.style.display = 'none';
  }

  if (okBox) okBox.hidden = false;
}

/**
 * Инициализация всех полей промокода на странице. Идемпотентна: повторный
 * вызов (после открытия модалки, подгрузки формы) не навесит обработчик дважды.
 */
export function initPromoFields(): void {
  document.querySelectorAll<HTMLElement>('[data-promo-root]').forEach((root) => {
    if ((root as any).__promoInit) return;
    (root as any).__promoInit = true;

    const input = root.querySelector<HTMLInputElement>('[data-promo-input]');
    if (!input) return;

    // Код мог быть введён в другой форме этой же сессии — подставляем и показываем.
    const saved = getStoredPromoCode();
    if (saved && !input.value) input.value = saved;
    render(root, input.value);

    input.addEventListener('input', () => render(root, input.value));
    input.addEventListener('blur', () => render(root, input.value));
  });
}

// Чат-бот (scripts/pages/ask.ts) собирает тело заявки сам, без submitLead —
// отдаём ему готовое примечание через window, чтобы не дублировать формулировки.
if (typeof window !== 'undefined') {
  (window as any).__promoNote = (priceRub?: number) => promoNoteForLead(priceRub);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPromoFields, { once: true });
  } else {
    initPromoFields();
  }
}
