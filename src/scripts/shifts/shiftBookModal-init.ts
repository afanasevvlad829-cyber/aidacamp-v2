import { formatPhone } from '../../utils/phoneMask';
import { hapticTap } from '../../scripts/haptic';
import { STORAGE_KEYS } from '../../lib/storage';

// Защита от повторной отправки той же заявки (телефон+смена) в течение 5 минут —
// инцидент 03.07.2026: два сабмита с интервалом 15 сек → два лида в CRM
const LEAD_RESEND_MS = 5 * 60 * 1000;
function wasRecentlySent(key: string): boolean {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.leadSent) || 'null');
    return Boolean(saved) && saved.k === key && Date.now() - saved.ts < LEAD_RESEND_MS;
  } catch {
    return false;
  }
}
function markSent(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEYS.leadSent, JSON.stringify({ k: key, ts: Date.now() }));
  } catch { /* ignore */ }
}

export function initShiftBookModal() {
  const modal = document.getElementById('shiftBookModal') as HTMLDialogElement | null;
  if (!modal || (modal as any).__bookInit) return;
  (modal as any).__bookInit = true;
  const bookModal = modal;

  document.querySelectorAll<HTMLElement>('button[data-haptic], a[data-haptic]')
    .forEach(el => el.addEventListener('click', hapticTap));

  const ageBtns = modal.querySelectorAll<HTMLButtonElement>('[data-book-age]');
  const phone = modal.querySelector<HTMLInputElement>('[data-book-phone]');
  const consent = modal.querySelector<HTMLInputElement>('[data-book-consent]');
  const consentPolicy = modal.querySelector<HTMLInputElement>('[data-book-consent-policy]');
  const submit = modal.querySelector<HTMLButtonElement>('[data-book-submit]');
  const nameEl = modal.querySelector<HTMLElement>('[data-book-shift-name]');
  const priceEl = modal.querySelector<HTMLElement>('[data-book-shift-price]');
  const errEl = modal.querySelector<HTMLElement>('[data-book-error]');
  const hintAge = modal.querySelector<HTMLElement>('[data-book-hint-age]');
  const hintPhone = modal.querySelector<HTMLElement>('[data-book-hint-phone]');
  const hintConsent = modal.querySelector<HTMLElement>('[data-book-hint-consent]');
  const waitlistBlock = modal.querySelector<HTMLElement>('[data-book-waitlist-block]');

  let selectedAge = '';

  function isWaitlist() { return bookModal.dataset.waitlist === 'true'; }
  function submitLabel() { return isWaitlist() ? 'Оставить заявку в лист ожидания' : 'Отправить заявку'; }

  function resetForm() {
    selectedAge = '';
    ageBtns.forEach((b) => {
      b.classList.remove('bg-primary', 'text-[#0d1a2b]', 'font-semibold');
      b.classList.add('border', 'border-slate-200', 'text-slate-700', 'font-medium');
    });
    hintAge?.classList.add('hidden');
    hintPhone?.classList.add('hidden');
    hintConsent?.classList.add('hidden');
    errEl?.classList.add('hidden');
    waitlistBlock?.classList.toggle('hidden', !isWaitlist());
    if (submit) submit.textContent = submitLabel();
    // Сброс CallTimeSelector (чипы + closure-переменные)
    bookModal.querySelector('.call-time-selector')?.dispatchEvent(new CustomEvent('call-time:reset'));
  }

  ageBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      ageBtns.forEach((b) => {
        b.classList.remove('bg-primary', 'text-[#0d1a2b]', 'font-semibold');
        b.classList.add('border', 'border-slate-200', 'text-slate-700', 'font-medium');
      });
      btn.classList.remove('border', 'border-slate-200', 'text-slate-700', 'font-medium');
      btn.classList.add('bg-primary', 'text-[#0d1a2b]', 'font-semibold');
      selectedAge = btn.dataset.bookAge || '';
      hintAge?.classList.add('hidden');
    });
  });

  phone?.addEventListener('input', () => {
    phone.value = formatPhone(phone.value);
    if ((phone.value.replace(/\D/g, '')).length === 11) hintPhone?.classList.add('hidden');
  });

  function bothConsentsChecked() {
    return (consent?.checked ?? false) && (consentPolicy?.checked ?? false);
  }
  consent?.addEventListener('change', () => { if (bothConsentsChecked()) hintConsent?.classList.add('hidden'); });
  consentPolicy?.addEventListener('change', () => { if (bothConsentsChecked()) hintConsent?.classList.add('hidden'); });

  function isPhoneValid() {
    const d = (phone?.value || '').replace(/\D/g, '');
    return d.length === 11 && d.startsWith('7');
  }
  function isAgeValid() { return Boolean(selectedAge); }

  submit?.addEventListener('click', async () => {
    errEl?.classList.add('hidden');
    const ageOk = isAgeValid();
    const phoneOk = isPhoneValid();
    const consentsOk = bothConsentsChecked();

    hintAge?.classList.toggle('hidden', ageOk);
    hintPhone?.classList.toggle('hidden', phoneOk);
    hintConsent?.classList.toggle('hidden', consentsOk);

    if (!ageOk || !phoneOk || !consentsOk) {
      let firstInvalid: HTMLElement | null = null;
      if (!ageOk) firstInvalid = modal.querySelector<HTMLElement>('[data-book-age-group]');
      else if (!phoneOk) firstInvalid = phone;
      else if (!consentsOk) firstInvalid = consentPolicy;
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (firstInvalid as HTMLInputElement | null)?.focus?.();
      return;
    }

    const dedupKey = `${(phone?.value || '').replace(/\D/g, '')}|${(nameEl?.textContent || '').trim()}`;
    if (wasRecentlySent(dedupKey)) {
      // Эта заявка уже ушла — не постим второй раз, ведём себя как при успехе
      modal.close();
      (document.getElementById('referralModal') as HTMLDialogElement | null)?.showModal();
      resetForm();
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Отправляем…';
    submit.classList.add('btn-loading');
    try {
      const callTimeInput = modal.querySelector<HTMLInputElement>('[data-call-time-value]');
      const { submitLead } = await import('../../scripts/form-submit');
      // Промокод: код уходит отдельным полем, а note_extra кладёт в CRM и
      // Telegram расшифровку условий и цену со скидкой — тем же путём, что
      // и Колесо фортуны (см. buildCrmNote в api/lead.ts).
      const { getStoredPromoCode, promoNoteForLead } = await import('../../scripts/promo');
      const priceRub = parseInt((priceEl?.textContent || '').replace(/[^\d]/g, ''), 10);
      const ok = await submitLead({
        phone: phone?.value || '',
        age: selectedAge,
        shift: nameEl?.textContent || '',
        form: isWaitlist() ? 'shifts_book_waitlist' : 'shifts_book',
        call_time: callTimeInput?.value || '',
        promo: getStoredPromoCode(),
        note_extra: promoNoteForLead(Number.isFinite(priceRub) ? priceRub : undefined),
      });
      if (ok) markSent(dedupKey);
      modal.close();
      const referralModal = document.getElementById('referralModal') as HTMLDialogElement | null;
      referralModal?.showModal();
      resetForm();
    } catch (e) {
      if (errEl) {
        errEl.textContent = 'Не удалось отправить — проверьте интернет и попробуйте ещё раз';
        errEl.classList.remove('hidden');
      }
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel();
      submit.classList.remove('btn-loading');
    }
  });

  // Сброс при каждом открытии (через MutationObserver, т.к. dialog не имеет 'open' event)
  const observer = new MutationObserver(() => {
    if (modal.open) resetForm();
  });
  observer.observe(modal, { attributes: true, attributeFilter: ['open'] });

  // Закрытие
  modal.querySelector('[data-shift-book-close]')?.addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });

  // Модалка уже открыта тем самым showModal(), который вызвал загрузку этого
  // модуля (см. bootstrap в ShiftBookModal.astro) — resetForm() не сработает
  // от наблюдателя (он ещё не был подписан в момент открытия), вызываем сами.
  resetForm();
}
