/**
 * Dead Click Tracker
 * Отслеживает клики по неинтерактивным элементам (dead clicks)
 * и rage clicks (3+ кликов за 1.5сек в радиусе 30px).
 * Данные батчатся и отправляются на /api/clicks.
 */

const INTERACTIVE = new Set([
  'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY', 'VIDEO', 'AUDIO',
]);

const BATCH_INTERVAL = 10_000; // отправка каждые 10сек
const RAGE_WINDOW = 1500; // 1.5сек
const RAGE_THRESHOLD = 3; // 3 клика = rage
const RAGE_RADIUS = 30; // px

interface ClickEvent {
  type: 'dead' | 'rage';
  path: string; // CSS-path элемента
  text: string; // текст элемента (до 80 символов)
  x: number;
  y: number;
  page: string;
  ts: number;
  vw: number; // viewport width
  count?: number; // для rage — кол-во кликов
}

let buffer: ClickEvent[] = [];
let recentClicks: { x: number; y: number; ts: number }[] = [];

function isInteractive(el: Element): boolean {
  if (INTERACTIVE.has(el.tagName)) return true;
  if (el.getAttribute('role') === 'button') return true;
  if (el.getAttribute('tabindex')) return true;
  if ((el as HTMLElement).onclick) return true;
  if (el.closest('a, button, input, select, textarea, label, [role="button"], [tabindex]')) return true;
  const style = getComputedStyle(el);
  if (style.cursor === 'pointer') return true;
  return false;
}

function cssPath(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;
  for (let i = 0; i < 4 && current && current !== document.body; i++) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const cls = current.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (cls) selector += `.${cls}`;
    }
    parts.unshift(selector);
    current = current.parentElement;
  }
  return parts.join(' > ');
}

function textOf(el: Element): string {
  return (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function flush() {
  if (buffer.length === 0) return;
  const payload = buffer.splice(0);
  navigator.sendBeacon('/api/clicks', JSON.stringify(payload));
}

function checkRage(x: number, y: number, now: number): number {
  recentClicks.push({ x, y, ts: now });
  recentClicks = recentClicks.filter(c => now - c.ts < RAGE_WINDOW);
  const nearby = recentClicks.filter(
    c => Math.abs(c.x - x) < RAGE_RADIUS && Math.abs(c.y - y) < RAGE_RADIUS
  );
  return nearby.length;
}

export function initDeadClicks() {
  document.addEventListener('click', (e) => {
    const target = e.target as Element;
    if (!target || target === document.body || target === document.documentElement) return;

    const now = Date.now();
    const x = Math.round(e.clientX);
    const y = Math.round(e.clientY);
    const rageCount = checkRage(x, y, now);

    // Rage click
    if (rageCount >= RAGE_THRESHOLD) {
      buffer.push({
        type: 'rage',
        path: cssPath(target),
        text: textOf(target),
        x, y,
        page: location.pathname,
        ts: now,
        vw: window.innerWidth,
        count: rageCount,
      });
      return;
    }

    // Dead click
    if (!isInteractive(target)) {
      buffer.push({
        type: 'dead',
        path: cssPath(target),
        text: textOf(target),
        x, y,
        page: location.pathname,
        ts: now,
        vw: window.innerWidth,
      });
    }
  }, { passive: true, capture: true });

  setInterval(flush, BATCH_INTERVAL);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
