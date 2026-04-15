// shift-modal.ts — единая модалка смены с табами Описание/Календарь/Подробнее
import { allShifts, shiftInfo, type Shift } from '../data/shifts';
import { renderCalendar } from './shift-calendar';
import { trackGoal } from './analytics';

type TabName = 'description' | 'calendar' | 'info';

let initialized = false;

export function initShiftModal() {
  const modal = document.getElementById('shift-modal');
  if (!modal) return;
  if (initialized) return;
  initialized = true;

  const backdrop = modal.querySelector<HTMLElement>('[data-shift-modal-backdrop]')!;
  const panel = modal.querySelector<HTMLElement>('[data-shift-modal-panel]')!;
  const closeBtn = modal.querySelector<HTMLElement>('[data-shift-modal-close]')!;
  const handle = modal.querySelector<HTMLElement>('[data-shift-modal-handle]');

  const titleEl = modal.querySelector<HTMLElement>('[data-shift-modal-title]')!;
  const datesEl = modal.querySelector<HTMLElement>('[data-shift-modal-dates]')!;
  const durationEl = modal.querySelector<HTMLElement>('[data-shift-modal-duration]')!;
  const dateRangeEl = modal.querySelector<HTMLElement>('[data-shift-modal-daterange]')!;
  const barTaken = modal.querySelector<HTMLElement>('[data-shift-modal-bar-taken]')!;
  const barFree = modal.querySelector<HTMLElement>('[data-shift-modal-bar-free]')!;
  const occupiedEl = modal.querySelector<HTMLElement>('[data-shift-modal-occupied]')!;
  const freeEl = modal.querySelector<HTMLElement>('[data-shift-modal-free]')!;
  const descriptionEl = modal.querySelector<HTMLElement>('[data-shift-modal-description]')!;
  const calendarGrid = modal.querySelector<HTMLElement>('[data-shift-modal-calendar-grid]')!;
  const infoBody = modal.querySelector<HTMLElement>('[data-shift-modal-info-body]')!;
  const priceEl = modal.querySelector<HTMLElement>('[data-shift-modal-price]')!;
  const bookBtn = modal.querySelector<HTMLButtonElement>('[data-shift-modal-book]')!;

  const tabBtns = Array.from(
    modal.querySelectorAll<HTMLButtonElement>('[data-shift-modal-tab]'),
  );
  const contentPanels = Array.from(
    modal.querySelectorAll<HTMLElement>('[data-shift-modal-content]'),
  );

  let currentShiftId = '';

  function setTab(name: TabName) {
    tabBtns.forEach((btn) => {
      const active = btn.dataset.shiftModalTab === name;
      btn.classList.toggle('bg-primary', active);
      btn.classList.toggle('text-white', active);
      btn.classList.toggle('text-slate-600', !active);
      btn.classList.toggle('hover:bg-slate-100', !active);
    });
    contentPanels.forEach((p) => {
      p.classList.toggle('hidden', p.dataset.shiftModalContent !== name);
    });
  }

  function populate(shift: Shift) {
    currentShiftId = shift.id;
    titleEl.textContent = shift.name;
    datesEl.textContent = shift.dates;
    durationEl.textContent = shift.duration;
    dateRangeEl.textContent = shift.dates;

    const total = shift.total || (shift.occupied + shift.free) || 1;
    const pct = Math.round((shift.occupied / total) * 100);
    barTaken.style.width = pct + '%';
    barFree.style.width = (100 - pct) + '%';
    occupiedEl.textContent = String(shift.occupied);
    freeEl.textContent = String(shift.free);

    descriptionEl.textContent = shift.description;
    priceEl.textContent = shift.price;

    // Calendar
    renderCalendar(shift.startDate, shift.endDate, shift.name, calendarGrid, document.createElement('div'));

    // Info (rich html)
    const info = shiftInfo[shift.id];
    infoBody.innerHTML = info ? info.html : '<p class="text-slate-500">Подробности появятся скоро.</p>';
  }

  function open(shiftId: string, tab: TabName) {
    const shift = allShifts.find((s) => s.id === shiftId);
    if (!shift) return;
    populate(shift);
    setTab(tab);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => {
      backdrop.classList.add('opacity-100');
      backdrop.classList.remove('opacity-0');
      panel.classList.remove('translate-y-full', 'md:translate-y-4', 'opacity-0');
      panel.classList.add('translate-y-0', 'md:translate-y-0', 'opacity-100');
    });

    trackGoal('shift_modal_open', { shift: shift.name, tab });
  }

  function close() {
    backdrop.classList.remove('opacity-100');
    backdrop.classList.add('opacity-0');
    panel.classList.add('translate-y-full', 'md:translate-y-4', 'opacity-0');
    panel.classList.remove('translate-y-0', 'md:translate-y-0', 'opacity-100');
    setTimeout(() => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }, 300);
  }

  // Tab switching
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.shiftModalTab as TabName;
      setTab(t);
    });
  });

  // Close handlers
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });

  // Mobile swipe-down to close
  let touchStartY = 0;
  let touchDeltaY = 0;
  let dragging = false;

  function onTouchStart(e: TouchEvent) {
    if (window.innerWidth >= 768) return;
    touchStartY = e.touches[0].clientY;
    touchDeltaY = 0;
    dragging = true;
    panel.style.transition = 'none';
  }
  function onTouchMove(e: TouchEvent) {
    if (!dragging) return;
    touchDeltaY = e.touches[0].clientY - touchStartY;
    if (touchDeltaY > 0) {
      panel.style.transform = `translateY(${touchDeltaY}px)`;
    }
  }
  function onTouchEnd() {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = '';
    panel.style.transform = '';
    if (touchDeltaY > 80) close();
  }
  handle?.addEventListener('touchstart', onTouchStart, { passive: true });
  handle?.addEventListener('touchmove', onTouchMove, { passive: true });
  handle?.addEventListener('touchend', onTouchEnd);

  // "Выбрать смену" → проксируем клик в существующий [data-shift-book] для открытия ShiftBookModal
  bookBtn.addEventListener('click', () => {
    const target = document.querySelector<HTMLButtonElement>(
      `[data-shift-book="${currentShiftId}"]`,
    );
    close();
    setTimeout(() => target?.click(), 320);
  });

  // === Клик по строке ShiftOccupancy ===
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const row = target.closest<HTMLElement>('[data-occupancy-shift]');
    if (row) {
      const id = row.dataset.occupancyShift || '';
      if (id) open(id, 'description');
    }
  });

  // === Event delegation на секции #shifts ===
  const shiftsSection = document.getElementById('shifts');
  if (!shiftsSection) return;

  shiftsSection.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Кнопка "Выбрать" — оставляем существующее поведение (ShiftBookModal)
    if (target.closest('[data-shift-book]')) return;

    // Кнопка календаря — открыть модалку на табе "Календарь"
    const calBtn = target.closest<HTMLElement>('[data-shift-calendar]');
    if (calBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = calBtn.dataset.shiftCalendar || '';
      open(id, 'calendar');
      return;
    }

    // Кнопка инфо — открыть модалку на табе "Подробнее"
    const infoBtn = target.closest<HTMLElement>('[data-shift-info]');
    if (infoBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = infoBtn.dataset.shiftInfo || '';
      open(id, 'info');
      return;
    }

    // Клик по самой карточке (не по кнопкам) — открыть на табе "Описание"
    const article = target.closest<HTMLElement>('article');
    if (article && shiftsSection.contains(article)) {
      const bookEl = article.querySelector<HTMLElement>('[data-shift-book]');
      const id = bookEl?.dataset.shiftBook || '';
      if (id) open(id, 'description');
    }
  });
}
