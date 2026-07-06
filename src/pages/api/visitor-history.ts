export const prerender = false;
import type { APIRoute } from 'astro';
import { getVisitorShiftHistory, formatVisitDate } from '../../lib/visitorHistory';
import { displayShifts, shiftDatesShort, DATES_SHORT_S21, DATES_SHORT_S22 } from '../../data/shifts';

// Главная страница отдаётся nginx статикой (root .../current/client/, try_files),
// Node для неё не вызывается — SSR-персонализация прямо в Astro-компоненте не
// работает (проверено 06.07.2026 на dev). /api/* же реально проксируется в живой
// Node-процесс — поэтому кука читается тут, а баннер на главной просто
// подтягивает эти данные через fetch() при загрузке.
type ShiftMeta = { name: string; dates: string; free: number };
const shiftMeta: Record<string, ShiftMeta> = {
  ...Object.fromEntries(displayShifts.map((s) => [s.id, { name: s.name.replace('Смена', 'Смену'), dates: shiftDatesShort(s), free: s.free }])),
  'shift-2-1': { name: 'Смену 2.1', dates: DATES_SHORT_S21, free: 0 },
  'shift-2-2': { name: 'Смену 2.2', dates: DATES_SHORT_S22, free: 0 },
};

export const GET: APIRoute = async ({ cookies }) => {
  const visitorId = cookies.get('aid_visitor')?.value;
  if (!visitorId) {
    return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
  }
  const history = await getVisitorShiftHistory(visitorId);
  const views = history
    .map((v) => ({ ...v, meta: shiftMeta[v.shiftId] }))
    .filter((v) => v.meta)
    .slice(0, 2)
    .map((v) => ({
      shiftId: v.shiftId,
      name: v.meta.name,
      dates: v.meta.dates,
      free: v.meta.free,
      lastSeenLabel: formatVisitDate(v.lastSeen),
    }));
  return new Response(JSON.stringify(views), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
