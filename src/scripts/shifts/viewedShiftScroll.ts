// Auto-scroll returning mobile visitors to their previously viewed shift
export function initViewedShiftScroll(): void {
  if (window.innerWidth >= 768) return;
  if (sessionStorage.getItem('ac:scroll_done')) return;

  let viewed: Array<{ id: string; ts: number }>;
  try {
    viewed = JSON.parse(localStorage.getItem('ac:viewed_shifts') || '[]');
  } catch {
    return;
  }
  if (!viewed.length) return;

  // Most recently viewed shift
  const targetId = viewed.sort((a, b) => b.ts - a.ts)[0].id;
  const track = document.querySelector<HTMLElement>('[data-shifts-marquee-track]');
  if (!track) return;

  // Find the item — querySelector gets the first (pre-duplication) occurrence
  const item = track.querySelector<HTMLElement>(`[data-shift-id="${targetId}"]`);
  if (!item) return;

  sessionStorage.setItem('ac:scroll_done', '1');

  // Wait for marquee JS to finish (it might reorder items), then scroll
  setTimeout(() => {
    const shiftsSection = document.getElementById('shifts');
    if (shiftsSection) {
      shiftsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Scroll the carousel track so the viewed shift card is centred
    setTimeout(() => {
      const vw = window.innerWidth;
      const itemLeft = item.offsetLeft;
      const itemWidth = item.offsetWidth;
      track.scrollTo({ left: itemLeft - (vw - itemWidth) / 2, behavior: 'smooth' });
    }, 400);
  }, 600);
}
