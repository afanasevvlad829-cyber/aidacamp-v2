import { STORAGE_KEYS } from '../../lib/storage';

// Счётчик «N ровесников уже едут в эту смену».
function showPeerCounts(age: string) {
  document.querySelectorAll<HTMLElement>('.peer-count-badge').forEach((badge) => {
    const counts = JSON.parse(badge.dataset.peerCounts || '{}');
    const n = counts[age];
    if (!n) return;
    const textEl = badge.querySelector<HTMLElement>('.peer-count-text');
    if (textEl) textEl.textContent = `${n} ровесников уже едут в эту смену`;
    badge.classList.remove('hidden');
    badge.classList.add('flex');
  });
}

export function initShiftAgePersonalization(): void {
  // Fix 2026-04-20: показываем peer-count ТОЛЬКО после явного выбора в сессии
  // (не читаем из localStorage — иначе на первом заходе показывается "ровесники"
  // без реального выбора возраста, логика бьётся).
  const sessionAge = sessionStorage.getItem(STORAGE_KEYS.selectedAge);
  if (sessionAge) showPeerCounts(sessionAge);
  document.addEventListener('age-personalize', (e: Event) => {
    showPeerCounts((e as CustomEvent<{ age: string }>).detail.age);
  });
}
