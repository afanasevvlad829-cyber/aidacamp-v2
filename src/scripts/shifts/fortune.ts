/** Milliseconds in one day */
export const MS_PER_DAY = 864e5;

/** Deposit fraction — 50% of final price */
export const DEPOSIT_RATE = 0.5;

/** Booking timer initial duration in seconds (30 min) */
export const TIMER_SECONDS = 30 * 60;

/** Final price after applying a discount percentage */
export function computeFortunePrice(basePrice: number, discountPct: number): number {
  return Math.round(basePrice * (1 - discountPct / 100));
}

/** Deposit amount — DEPOSIT_RATE of the final price */
export function computeDeposit(finalPrice: number): number {
  return Math.round(finalPrice * DEPOSIT_RATE);
}

/** Format a number as a Russian-locale ruble string */
export function formatRub(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}

/** Whole days from todayMs until targetMs (0 if past, ceiling for partial days) */
export function daysUntil(targetMs: number, todayMs: number): number {
  return Math.max(0, Math.ceil((targetMs - todayMs) / MS_PER_DAY));
}

/** Russian label for days remaining until an event */
export function formatDaysLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'сегодня';
  if (daysLeft === 1) return 'через 1 день';
  return `через ${daysLeft} дн`;
}

/** Format a seconds count as a MM:SS timer string */
export function formatTimerTick(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}
