import { YANDEX_METRIKA_ID, MAILRU_PIXEL_ID } from '../data/tracking';
import { STORAGE_KEYS } from '../lib/storage';
const fired = new Set<string>(JSON.parse(sessionStorage.getItem(STORAGE_KEYS.ymFired) || '[]'));

function persist() {
  sessionStorage.setItem(STORAGE_KEYS.ymFired, JSON.stringify([...fired]));
}

export function trackGoal(id: string, params?: object, value = 100) {
  if (fired.has(id)) return;
  fired.add(id);
  persist();
  // Яндекс.Метрика
  try {
    if (typeof (window as any).ym !== 'undefined') {
      (window as any).ym(YANDEX_METRIKA_ID, 'reachGoal', id, params ?? {});
    }
  } catch {}
  // Top.Mail.Ru (VK Ads attribution) — единственное место вместо 11 дублирований
  try {
    (window as any)._tmr = (window as any)._tmr ?? [];
    (window as any)._tmr.push({ type: 'reachGoal', id: MAILRU_PIXEL_ID, value, goal: id });
  } catch {}
  // Своя аналитика — сохраняем параметрированные события в PostgreSQL
  // Отправляем только если есть params (чтобы не флудить простыми scroll_* и т.п.)
  if (params && Object.keys(params).length > 0) {
    try {
      const payload = {
        goal: id,
        params,
        url: location.href,
        referrer: document.referrer || undefined,
        client_id: (document.cookie.match(/_ym_uid=(\d+)/) ?? [])[1] ?? undefined,
      };
      // sendBeacon не блокирует страницу и работает при unload
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
      } else {
        fetch('/api/track', { method: 'POST', body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
      }
    } catch {}
  }
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
  // Яндекс.Карты: клик по карте/адресу и «Построить маршрут» (rtext=) — горячий intent-сигнал
  document.querySelectorAll<HTMLAnchorElement>(`${scope} a[href*="yandex.ru/maps"]`).forEach((a) => {
    a.addEventListener('click', () =>
      trackGoal(a.href.includes('rtext=') ? 'maps_route_click' : 'maps_click', { href: a.href.slice(0, 150), page: location.pathname }));
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
      (window.scrollY / (document.documentElement.scrollHeight - (window.visualViewport?.height ?? window.innerHeight))) * 100
    );
    goals.forEach((g) => {
      if (pct >= g.p && !fired.has(g.id)) {
        trackGoal(g.id);
      }
    });
  }, { passive: true });
}

/** ID счётчика Яндекс.Метрики. */
export const YM_COUNTER = YANDEX_METRIKA_ID;
export const YM_COUNTER_ID = String(YANDEX_METRIKA_ID);
