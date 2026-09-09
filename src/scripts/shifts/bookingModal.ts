// Биндинг кнопок открытия модалки бронирования + заполнение данных смены.
// Вся логика валидации/сабмита формы — внутри ShiftBookModal.astro (self-contained).
export function initBookingModal(): void {
  const bookModal = document.getElementById('shiftBookModal') as HTMLDialogElement | null;
  if (!bookModal) return;
  const bookShiftBlock = bookModal.querySelector<HTMLElement>('[data-book-shift-block]');
  const bookName = bookModal.querySelector('[data-book-shift-name]');
  const bookDates = bookModal.querySelector('[data-book-shift-dates]');
  const bookDuration = bookModal.querySelector('[data-book-shift-duration]');
  const bookPrice = bookModal.querySelector('[data-book-shift-price]');

  document.querySelectorAll('[data-shift-book]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      const name = el.dataset.shiftBookName || '';
      if (bookName) bookName.textContent = name;
      if (bookDates) bookDates.textContent = el.dataset.shiftBookDates || '';
      if (bookDuration) bookDuration.textContent = el.dataset.shiftBookDuration || '';
      if (bookPrice) bookPrice.textContent = el.dataset.shiftBookPrice || '';
      if (bookShiftBlock) bookShiftBlock.classList.toggle('hidden', !name);
      (bookModal as HTMLElement).dataset.waitlist = el.dataset.shiftWaitlist === 'true' ? 'true' : 'false';
      bookModal.showModal();
      (window as any).trackGoal?.(el.dataset.shiftWaitlist === 'true' ? 'waitlist_click' : 'shift_book_click', { shift: name }, 500);
    });
  });
}
