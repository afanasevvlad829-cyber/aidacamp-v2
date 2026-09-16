/**
 * Глобальные скрипты страницы (загружаются один раз через <script> в Base.astro).
 * Ранее были is:inline в Base.astro — перенесены в модуль для кэширования браузером.
 *
 * Содержит: trackGoal global, scroll/contact tracking, spots reveal, waitlist tooltip,
 * cookie banner, debug modal, unknown anchors / retarget scroll.
 */

import { trackGoal, initScrollTracking, initContactTracking, initEngagementTracking } from './analytics';

// Экспонируем на window: компоненты используют window.trackGoal?.()
window.trackGoal = trackGoal;

// Scroll tracking — модуль deferred, вызываем напрямую
initScrollTracking();

// Составная цель quality_visit (время x глубина) — для смарт-стратегий Директа
initEngagementTracking();

// Инициализация контактного трекинга для тех компонентов, которые ещё не используют
// прямой импорт из analytics.ts (обратная совместимость)
initContactTracking('body');

// --- Spots reveal ---
// Число свободных мест скрыто блюром до клика «узнать места».
// Разметка: [data-spots-num][data-spots-shift], [data-spots-bar], [data-spots-reveal-btn]

const SPOTS_KEY = 'ac:occ_revealed';

function spotsRevealed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(SPOTS_KEY) || '[]'); } catch { return []; }
}

function spotsReveal(shiftId: string) {
  document.querySelectorAll<HTMLElement>(`[data-spots-num][data-spots-shift="${shiftId}"]`)
    .forEach(el => el.classList.remove('blur-[6px]'));
  document.querySelectorAll<HTMLElement>(`[data-spots-bar][data-spots-shift="${shiftId}"]`)
    .forEach(el => { el.style.width = (el.dataset.spotsWidth ?? '0%'); });
  document.querySelectorAll<HTMLElement>(`[data-spots-reveal-btn][data-spots-shift="${shiftId}"]`)
    .forEach(el => el.classList.add('hidden'));
}

function spotsInit() {
  spotsRevealed().forEach(spotsReveal);
}

document.addEventListener('click', (e) => {
  const btn = (e.target as Element)?.closest?.('[data-spots-reveal-btn], [data-spots-num]') as HTMLElement | null;
  if (!btn) return;
  const shiftId = btn.dataset.spotsShift;
  if (!shiftId) return;
  const revealed = spotsRevealed();
  if (!revealed.includes(shiftId)) {
    revealed.push(shiftId);
    try { sessionStorage.setItem(SPOTS_KEY, JSON.stringify(revealed)); } catch {}
  }
  spotsReveal(shiftId);
  trackGoal('available_spots', { shift: shiftId });
  const isLow = btn.dataset.spotsLow === '1'
    || !!document.querySelector(`[data-spots-reveal-btn][data-spots-shift="${shiftId}"][data-spots-low="1"]`);
  if (isLow) trackGoal('viewed_low_availability', { shift: shiftId });
});

document.addEventListener('astro:page-load', spotsInit);
spotsInit();

// --- Waitlist tooltip ---
// Иконка «?» рядом с кнопкой «Лист ожидания» — тултип по клику.
// Разметка: WaitlistInfoIcon.astro → [data-waitlist-info-btn], [data-waitlist-info-tooltip], [data-waitlist-info]

document.addEventListener('click', (e) => {
  const btn = (e.target as Element)?.closest?.('[data-waitlist-info-btn]') as HTMLElement | null;
  if (btn) {
    const tip = btn.parentElement?.querySelector<HTMLElement>('[data-waitlist-info-tooltip]');
    document.querySelectorAll<HTMLElement>('[data-waitlist-info-tooltip]').forEach(el => {
      if (el !== tip) el.classList.add('hidden');
    });
    if (tip) tip.classList.toggle('hidden');
    return;
  }
  if (!(e.target as Element)?.closest?.('[data-waitlist-info]')) {
    document.querySelectorAll<HTMLElement>('[data-waitlist-info-tooltip]')
      .forEach(el => el.classList.add('hidden'));
  }
});

// --- Cookie banner ---
if (!localStorage.getItem('cookieAccepted')) {
  const banner = document.getElementById('cookieBanner') as HTMLElement | null;
  if (banner) {
    banner.style.display = 'block';
    document.getElementById('cookieAccept')?.addEventListener('click', () => {
      localStorage.setItem('cookieAccepted', '1');
      banner.style.display = 'none';
    });
  }
}

// --- Debug modal (?modal=referral открывает модалку напрямую) ---
const modalParam = new URLSearchParams(location.search).get('modal');
if (modalParam) {
  const tryOpen = () => {
    const el = document.getElementById(modalParam + 'Modal') as HTMLDialogElement | null;
    if (!el || el.open) return;
    try { el.showModal(); } catch {}
  };
  setTimeout(tryOpen, 100);
  document.addEventListener('astro:page-load', () => setTimeout(tryOpen, 100));
}

// --- Unknown anchors + retarget → scroll to #shifts ---
const KNOWN_ANCHORS = [
  'shifts', 'about', 'gallery', 'gallery-preview', 'faq', 'booking', 'price',
  'smeny', 'program', 'tracks', 'philosophy', 'economy', 'journey', 'team',
  'stay', 'reviews', 'contacts', 'videos', 'hackathon', 'mentors', 'hero', 'waitlist',
];
const hash = (location.hash || '').replace('#', '');
if (location.search.includes('ybaip=1') || (hash && !KNOWN_ANCHORS.includes(hash))) {
  document.getElementById('shifts')?.scrollIntoView({ behavior: 'instant', block: 'start' });
}
