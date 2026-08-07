/** Достаём валидные строковые id из тела запроса — без дублей, максимум `max` штук (граница доверия входа). */
export function clampIds(raw: unknown, max = 300): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== 'string' || !v) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

/** Имя файла для Content-Disposition — буквы (включая кириллицу)/цифры/пробелы/точки/дефисы, остальное вырезаем. */
export function safeZipFilename(shiftName: string): string {
  const cleaned = shiftName.replace(/[^\p{L}\p{N} .-]/gu, '').trim();
  return (cleaned || 'foto') + '.zip';
}
