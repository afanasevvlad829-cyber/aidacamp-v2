// src/lib/visitorHistory.ts
// SSR-персонализация: по кук aid_visitor (HttpOnly, ставит nginx) поднимаем
// реальную историю просмотров смен из БД — переживает очистку localStorage,
// не привязана к одному браузеру/устройству (пока кука та же).
import { query } from './db';

export interface ShiftView {
  shiftId: string;
  firstSeen: Date;
  lastSeen: Date;
}

/** История просмотров страниц смен конкретным visitor_id, свежие сначала. */
export async function getVisitorShiftHistory(visitorId: string): Promise<ShiftView[]> {
  if (!visitorId) return [];
  const rows = await query<{ shift_id: string | null; first_seen: string; last_seen: string }>(
    `SELECT (regexp_match(landing_url, '/shifts/(shift-[0-9a-z-]+)/?'))[1] AS shift_id,
            min(ts) AS first_seen, max(ts) AS last_seen
     FROM visits
     WHERE visitor_id = $1 AND landing_url ~ '/shifts/shift-'
     GROUP BY 1
     ORDER BY last_seen DESC
     LIMIT 5`,
    [visitorId],
  );
  if (!rows) return [];
  return rows
    .filter((r): r is { shift_id: string; first_seen: string; last_seen: string } => !!r.shift_id)
    .map((r) => ({ shiftId: r.shift_id, firstSeen: new Date(r.first_seen), lastSeen: new Date(r.last_seen) }));
}

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];

/** «5 июля» — короткая дата визита для баннера возвратника. */
export function formatVisitDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_GENITIVE[d.getMonth()]}`;
}
