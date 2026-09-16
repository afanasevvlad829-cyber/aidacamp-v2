/**
 * У Immich нет структурированных «имя/фамилия» — только цельная строка `name`,
 * и порядок слов в ней различается по сменам (кто заводил карточку ребёнка в
 * Immich, тот и выбирал порядок). Проверено вживую по всем трём сменам:
 * shift-1/shift-2 — преимущественно «Имя Фамилия», shift-3 — преимущественно
 * «Фамилия Имя». Это общий порядок ПО СМЕНЕ, плюс явные точечные исключения
 * (конкретные дети, у которых порядок отличается от общего для их смены).
 *
 * Появилась новая смена — добавь её сюда, посмотрев реальные имена через живой
 * GET /api/foto/:shiftId/people, преимущественный порядок на глаз виден сразу.
 * Нашли ещё одно имя не под той буквой — добавь его в NAME_SORT_OVERRIDES.
 */
export const SHIFT_NAME_ORDER: Record<string, 'surname-first' | 'firstname-first'> = {
  'shift-1': 'firstname-first',
  'shift-2': 'firstname-first',
  'shift-3': 'surname-first',
};

/**
 * Явные исключения — точное имя (как в Immich) → правильный ключ сортировки
 * («Фамилия Имя»), независимо от общего порядка смены. Для имён, которые УЖЕ
 * в формате «Фамилия Имя» несмотря на общий порядок смены — ключ равен самому
 * имени (чтобы общее правило смены их не переставило ещё раз).
 */
export const NAME_SORT_OVERRIDES: Record<string, string> = {
  'Александр Сытик': 'Сытик Александр',
  'Данила Рогов': 'Рогов Данила',
  'Григорьева Людмила': 'Григорьева Людмила',
  'Вуколов Петр': 'Вуколов Петр',
};

/** Ключ для сортировки по фамилии — см. комментарии выше про источник правил. */
export function surnameSortKey(name: string, shiftId: string): string {
  if (name in NAME_SORT_OVERRIDES) return NAME_SORT_OVERRIDES[name];
  const order = SHIFT_NAME_ORDER[shiftId] ?? 'surname-first';
  if (order === 'firstname-first') {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 2) return `${parts[1]} ${parts[0]}`;
  }
  return name;
}
