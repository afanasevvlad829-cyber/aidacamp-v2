/**
 * Renders a mini-calendar for a shift date range.
 * Shows only weeks that contain shift days.
 */
export function renderCalendar(
  startStr: string,
  endStr: string,
  shiftName: string,
  gridEl: Element,
  titleEl: Element,
) {
  titleEl.textContent = shiftName;

  const start = new Date(startStr);
  const end = new Date(endStr);

  const months: { year: number; month: number }[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur.setMonth(cur.getMonth() + 1);
  }

  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  type Cell = { day: number; date: Date } | null;

  let html = '';
  for (const m of months) {
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
    const firstDow = (() => { const d = new Date(m.year, m.month, 1).getDay(); return d === 0 ? 6 : d - 1; })();

    const weeks: Cell[][] = [];
    let week: Cell[] = [];
    for (let i = 0; i < firstDow; i++) week.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      week.push({ day: d, date: new Date(m.year, m.month, d) });
      if (week.length === 7) { weeks.push(week); week = []; }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }

    const shiftWeeks = weeks.filter(w => w.some(c => c && c.date >= start && c.date <= end));
    if (shiftWeeks.length === 0) continue;

    html += `<div class="mb-4"><p class="text-center text-[14px] font-semibold text-slate-900 mb-2">${monthNames[m.month]} ${m.year}</p>`;
    html += '<div class="grid grid-cols-7 gap-1 text-center">';
    for (const d of dayNames) {
      html += `<div class="text-[11px] font-medium text-slate-400 pb-1">${d}</div>`;
    }

    for (const w of shiftWeeks) {
      for (const cell of w) {
        if (!cell) { html += '<div></div>'; continue; }
        const isShift = cell.date >= start && cell.date <= end;
        let classes = 'text-[13px] py-1 rounded-lg ';
        classes += isShift ? 'bg-primary text-white font-semibold' : 'text-slate-600';
        html += `<div class="${classes}">${cell.day}</div>`;
      }
    }
    html += '</div></div>';
  }

  html += '<div class="flex items-center justify-center mt-2">';
  html += '<div class="flex items-center gap-1.5"><div class="h-3 w-3 rounded bg-primary"></div><span class="text-[11px] text-slate-500">Дни смены</span></div>';
  html += '</div>';

  gridEl.innerHTML = html;
}
