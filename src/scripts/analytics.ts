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

/**
 * Составная цель "quality_visit": ≥3 мин на сайте И ≥5 просмотренных страниц за визит.
 * Заявок мало (0,19% визитов) — смарт-стратегиям Директа не хватает сигнала для обучения.
 * Анализ пересечений (ball_intersect, 05.08.2026) показал: время и глубина сами по себе
 * коррелируют между собой и порознь почти не предсказывают заявку, а вот их пересечение —
 * визиты одновременно с обоими признаками — даёт долю заявок в 30-80 раз выше базовой.
 * Эта цель — прокси-сигнал для обучения стратегий, более частый и честный, чем "заявка".
 */
function qvState(): { start: number; pages: number } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.qualityVisit);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { start: Date.now(), pages: 0 };
}

function qvSave(st: { start: number; pages: number }) {
  try { sessionStorage.setItem(STORAGE_KEYS.qualityVisit, JSON.stringify(st)); } catch {}
}

function qvCheck() {
  const st = qvState();
  const elapsedSec = (Date.now() - st.start) / 1000;
  if (elapsedSec >= 180 && st.pages >= 5) trackGoal('quality_visit');
}

export function initEngagementTracking() {
  const onNav = () => {
    const st = qvState();
    st.pages += 1;
    qvSave(st);
    qvCheck();
  };
  onNav(); // текущая страница (первая в визите или после client-side навигации)
  document.addEventListener('astro:page-load', onNav);
  setInterval(qvCheck, 20000); // ловит случай "долистал до 5 страниц, потом завис на одной"
}

/** ID счётчика Яндекс.Метрики. */
export const YM_COUNTER = YANDEX_METRIKA_ID;
export const YM_COUNTER_ID = String(YANDEX_METRIKA_ID);
