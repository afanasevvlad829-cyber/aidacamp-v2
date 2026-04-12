import { YANDEX_METRIKA_ID } from '../data/tracking';
const fired = new Set<string>(JSON.parse(sessionStorage.getItem('ym_fired') || '[]'));

function persist() {
  sessionStorage.setItem('ym_fired', JSON.stringify([...fired]));
}

export function trackGoal(id: string, params?: object) {
  if (fired.has(id)) return;
  fired.add(id);
  persist();
  try {
    if (typeof (window as any).ym !== 'undefined') {
      (window as any).ym(YANDEX_METRIKA_ID, 'reachGoal', id, params ?? {});
    }
  } catch {}
}

export function initContactTracking(scope: string) {
  document.querySelectorAll<HTMLAnchorElement>(`${scope} a[href^="tel:"]`).forEach((a) => {
    a.addEventListener('click', () => trackGoal('phone_click'));
  });
  document.querySelectorAll<HTMLAnchorElement>(`${scope} a[href*="wa.me"]`).forEach((a) => {
    a.addEventListener('click', () => trackGoal('whatsapp_click'));
  });
  document.querySelectorAll<HTMLAnchorElement>(`${scope} a[href*="t.me"]`).forEach((a) => {
    a.addEventListener('click', () => trackGoal('telegram_click'));
  });
}

export function initScrollTracking() {
  const goals = [
    { p: 25, id: 'scroll_25' },
    { p: 50, id: 'scroll_50' },
    { p: 75, id: 'scroll_75' },
    { p: 90, id: 'scroll_90' },
  ];
  window.addEventListener('scroll', () => {
    const pct = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    goals.forEach((g) => {
      if (pct >= g.p && !fired.has(g.id)) {
        trackGoal(g.id);
      }
    });
  }, { passive: true });
}
