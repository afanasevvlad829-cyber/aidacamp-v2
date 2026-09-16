// Общий паттерн «выполнить после rAF-простоя, но не позже timeout» — до
// вынесения сюда (09.09.2026) был скопирован в Shifts.astro трижды почти
// дословно. requestIdleCallback есть не везде (Safari) — там просто короткий
// setTimeout, чтобы код всё равно выполнился быстро.
export function onIdle(fn: () => void, timeout = 2000): void {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, 200);
  }
}
