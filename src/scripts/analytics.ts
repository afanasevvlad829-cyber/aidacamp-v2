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
      (window as any).ym(96499295, 'reachGoal', id, params ?? {});
    }
  } catch {}
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
