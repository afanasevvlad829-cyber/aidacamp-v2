// Сетки мини-календарей для сезонных лендингов (SeasonCalendar + выбор окна в SeasonPreRegister).
// Чистые функции: Astro-компилятор не любит операторы сравнения в разметке.

export interface CalRange { from: string; to: string; primary?: boolean; }
export type CellState = 'primary' | 'secondary' | 'month' | 'off';
export interface CalCell { day: number; state: CellState; }

export const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const WEEKDAYS = ['пн','вт','ср','чт','пт','сб','вс'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Сетка месяца (недели пн–вс). Неделя попадает в результат, если содержит
 * день месяца или день любого из диапазонов (для перетекающих заездов).
 * compact=true — только недели, пересекающие диапазоны (для карточек выбора).
 */
export function buildMonthCells(year: number, month: number, ranges: CalRange[], compact = false): CalCell[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startOffset = (first.getUTCDay() + 6) % 7;
  const cur = new Date(first);
  cur.setUTCDate(1 - startOffset);

  const weeks: CalCell[][] = [];
  for (let wk = 0; wk < 6; wk++) {
    const week: CalCell[] = [];
    let touchesMonth = false;
    let touchesRange = false;
    for (let d = 0; d < 7; d++) {
      const dayIso = iso(cur);
      const inMonth = cur.getUTCMonth() === month - 1;
      const hit = ranges.find((r) => dayIso >= r.from && dayIso <= r.to);
      if (inMonth) touchesMonth = true;
      if (hit) touchesRange = true;
      const state: CellState = hit ? (hit.primary ? 'primary' : 'secondary') : inMonth ? 'month' : 'off';
      week.push({ day: cur.getUTCDate(), state });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    if (compact ? touchesRange : (touchesMonth || touchesRange)) weeks.push(week);
  }
  return weeks.flat();
}

export function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}
