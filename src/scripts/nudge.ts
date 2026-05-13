/**
 * Nudge system — non-intrusive toast notifications
 * 7 flows triggered by user behavior (scroll, time, exit intent)
 */

interface NudgeFlow {
  id: string;
  message: string;
  trigger: 'scroll' | 'time' | 'exit';
  value: number; // scroll % or time in ms
  once: boolean;
}

const flows: NudgeFlow[] = [
  { id: 'scroll-30', message: 'Смена 2 — самая популярная. Осталось 12 мест', trigger: 'scroll', value: 30, once: true },
  { id: 'scroll-60', message: 'Каждый день — фотоотчёт для родителей', trigger: 'scroll', value: 60, once: true },
  { id: 'scroll-80', message: 'Лицензированный туроператор РТО 025773', trigger: 'scroll', value: 80, once: true },
  // time-based nudges отключены: всплывали через 30/60/90 сек, отвлекали от букинга
  // { id: 'time-30', message: 'Раннее бронирование — скидка до 10%', trigger: 'time', value: 30000, once: true },
  // { id: 'time-60', message: 'Более 200 семей уже выбрали АйДаКемп', trigger: 'time', value: 60000, once: true },
  // { id: 'time-90', message: 'Авторы учебника по Python для детей — наши преподаватели', trigger: 'time', value: 90000, once: true },
  { id: 'exit', message: 'Уже уходите? Оставьте номер — расскажем подробнее', trigger: 'exit', value: 0, once: true },
];

const STORAGE_KEY = 'nudge_shown';

function getShown(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function markShown(id: string) {
  const shown = getShown();
  shown.add(id);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...shown]));
}

let toastEl: HTMLElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;
let isVisible = false;

export function showNudge(message: string) {
  if (!toastEl) return;
  if (isVisible) return;

  const textEl = document.getElementById('nudge-text');
  if (textEl) textEl.textContent = message;

  toastEl.classList.remove('translate-y-full', 'opacity-0');
  toastEl.classList.add('translate-y-0', 'opacity-100');
  isVisible = true;

  if (hideTimeout) clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    hideNudge();
  }, 5000);
}

function hideNudge() {
  if (!toastEl) return;
  toastEl.classList.remove('translate-y-0', 'opacity-100');
  toastEl.classList.add('translate-y-full', 'opacity-0');
  isVisible = false;
}

export function initNudges() {
  toastEl = document.getElementById('nudge-toast');
  if (!toastEl) return;

  // Close button
  const closeBtn = toastEl.querySelector('[data-nudge-close]');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideNudge();
      if (hideTimeout) clearTimeout(hideTimeout);
    });
  }

  // Expose globally for console testing
  (window as any).showNudge = showNudge;

  const shown = getShown();

  // Scroll triggers
  const scrollFlows = flows.filter(f => f.trigger === 'scroll' && !shown.has(f.id));
  if (scrollFlows.length) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollPct = Math.round(
          (window.scrollY / (document.documentElement.scrollHeight - (window.visualViewport?.height ?? window.innerHeight))) * 100
        );
        for (const flow of scrollFlows) {
          if (scrollPct >= flow.value && !getShown().has(flow.id)) {
            markShown(flow.id);
            showNudge(flow.message);
            break;
          }
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // Time triggers
  const timeFlows = flows.filter(f => f.trigger === 'time' && !shown.has(f.id));
  for (const flow of timeFlows) {
    setTimeout(() => {
      if (!getShown().has(flow.id)) {
        markShown(flow.id);
        showNudge(flow.message);
      }
    }, flow.value);
  }

  // Exit intent (desktop only)
  const exitFlow = flows.find(f => f.trigger === 'exit' && !shown.has(f.id));
  if (exitFlow && window.matchMedia('(min-width: 1024px)').matches) {
    document.addEventListener('mouseout', (e: MouseEvent) => {
      if (e.clientY <= 0 && !getShown().has(exitFlow.id)) {
        markShown(exitFlow.id);
        showNudge(exitFlow.message);
      }
    });
  }
}
