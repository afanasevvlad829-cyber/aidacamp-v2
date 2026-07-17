import { YANDEX_METRIKA_ID } from '../data/tracking';

// Единственная реализация трекинга — inline-скрипт в src/layouts/Base.astro
// (window.trackGoal: дедуп по sessionStorage + Метрика + /api/track). Раньше здесь
// был отдельный дублирующий трекер (свой Set для дедупа, свой вызов ym, свой POST) —
// убран в пользу одного источника правды. Обёртка нужна только компонентам,
// которым удобнее делать import вместо window.trackGoal?.().
export function trackGoal(id: string, params?: object) {
  (window as any).trackGoal?.(id, params);
}

/** ID счётчика Яндекс.Метрики. */
export const YM_COUNTER = YANDEX_METRIKA_ID;
export const YM_COUNTER_ID = String(YANDEX_METRIKA_ID);
