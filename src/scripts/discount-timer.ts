/**
 * discount-timer.ts
 *
 * При первом открытии ShiftModal запускает 30-минутный таймер.
 * Пока таймер идёт:
 *  • В модале показывает зачёркнутую цену + цену со скидкой 5%
 *  • В ReturnBanner вставляет обратный отсчёт + «Скидка 5%»
 *  • При отправке формы добавляет discount=true в данные заявки
 */

// fmtPrice статически тянет dynamicPrices → shifts.ts (тяжёлые данные смен,
// ~25 КБ raw) в eager-бандл каждой страницы. Грузим лениво в patchModalPrice —
// он выполняется только при открытой модалке с активной скидкой.

const DURATION_MS = 30 * 60 * 1000; // 30 минут
const LS_START    = 'discount_start_v1';
const DISCOUNT    = 0.05; // 5%

// ── helpers ──────────────────────────────────────────────────────────────────

function getStartTs(): number | null {
  const v = localStorage.getItem(LS_START);
  return v ? parseInt(v, 10) : null;
}

function setStartTs(): number {
  const now = Date.now();
  localStorage.setItem(LS_START, String(now));
  return now;
}

function getRemainingMs(): number {
  const start = getStartTs();
  if (start === null) return 0;
  return Math.max(0, start + DURATION_MS - Date.now());
}

export function isDiscountActive(): boolean {
  return getRemainingMs() > 0;
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Парсит строку вида "74 900 ₽" → число 74900 */
function parsePrice(priceStr: string): number {
  return parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
}

// ── Modal price patch ─────────────────────────────────────────────────────────

let modalPriceInterval: ReturnType<typeof setInterval> | null = null;

async function patchModalPrice(priceEl: HTMLElement, originalPriceText: string) {
  const orig = parsePrice(originalPriceText);
  if (!orig) return;

  // Ленивый импорт (см. комментарий вверху файла); к этому моменту модалка
  // открыта и чанк данных смен уже загружен shift-modal'ом — из кэша.
  const { fmtPrice } = await import('../data/dynamicPrices');

  const discounted = Math.round(orig * (1 - DISCOUNT));

  priceEl.innerHTML = `
    <span style="text-decoration:line-through;color:#94a3b8;font-size:0.7em;font-weight:500;margin-right:6px">${fmtPrice(orig)}</span>
    <span style="color:#15803d">${fmtPrice(discounted)}</span>
    <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:1px 7px;border-radius:99px;margin-left:5px;vertical-align:middle">−5%</span>
  `;
}

function restoreModalPrice(priceEl: HTMLElement, originalPriceText: string) {
  priceEl.textContent = originalPriceText;
}

// ── ReturnBanner patch ────────────────────────────────────────────────────────

let bannerInterval: ReturnType<typeof setInterval> | null = null;

function patchBanner() {
  if (bannerInterval) return; // уже запущен

  bannerInterval = setInterval(() => {
    const rem = getRemainingMs();
    if (rem <= 0) {
      clearInterval(bannerInterval!);
      bannerInterval = null;
      restoreBanner();
      return;
    }

    const textEl = document.getElementById('return-banner-text');
    const banner = document.getElementById('return-banner');

    if (!textEl || !banner) return;

    textEl.textContent = `Скидка 5% — осталось ${formatRemaining(rem)}`;

    // Покрасим баннер в зелёный
    banner.style.background = '#15803d';
  }, 1000);
}

function restoreBanner() {
  const banner = document.getElementById('return-banner');
  if (banner) banner.style.background = '';
  // ReturnBanner сам перерисуется при следующей итерации initReturnBanner
}

// ── Discount notice under form button ────────────────────────────────────────

function injectDiscountNotice() {
  const bookBtn = document.querySelector<HTMLElement>('[data-shift-modal-book]');
  if (!bookBtn || document.getElementById('discount-notice')) return;

  const notice = document.createElement('p');
  notice.id = 'discount-notice';
  notice.style.cssText = `
    text-align:center; font-size:12px; color:#15803d; font-weight:600;
    margin-top:6px; font-family:system-ui,sans-serif;
  `;

  const update = () => {
    const rem = getRemainingMs();
    if (rem > 0) {
      notice.textContent = `Скидка 5% при оплате сейчас · осталось ${formatRemaining(rem)}`;
    } else {
      notice.textContent = '';
    }
  };
  update();
  setInterval(update, 1000);

  bookBtn.after(notice);
}

// ── Main entry ────────────────────────────────────────────────────────────────

export function initDiscountTimer() {
  // Патчим open() в shift-modal через MutationObserver на открытие модала
  const modal = document.getElementById('shift-modal');
  if (!modal) return;

  let lastPriceText = '';

  const observer = new MutationObserver(() => {
    const isOpen = !modal.classList.contains('hidden');
    const priceEl = modal.querySelector<HTMLElement>('[data-shift-modal-price]');
    if (!priceEl) return;

    if (isOpen) {
      // При открытии — запускаем таймер только для повторно вернувшихся
      if (getStartTs() === null) {
        const hasViewedShifts = !!localStorage.getItem('ac:viewed_shifts');
        if (hasViewedShifts) setStartTs();
      }

      const currentText = priceEl.textContent || '';
      if (currentText && currentText !== lastPriceText) {
        lastPriceText = currentText;
      }

      // Ждём пока populate() не поставит цену
      const waitForPrice = () => {
        const text = priceEl.textContent || '';
        if (text && text !== lastPriceText) {
          lastPriceText = text;
        }
        if (isDiscountActive() && text && /\d/.test(text) && !text.includes('−5%')) {
          patchModalPrice(priceEl, text);
          injectDiscountNotice();
          patchBanner();
        }
      };
      setTimeout(waitForPrice, 50);
      setTimeout(waitForPrice, 150);
    }
  });

  observer.observe(modal, { attributes: true, attributeFilter: ['class'] });

  // Если таймер уже шёл — сразу запустить баннер
  if (isDiscountActive()) patchBanner();
}
