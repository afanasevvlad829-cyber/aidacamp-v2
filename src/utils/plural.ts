/**
 * Русское склонение по числу.
 *
 * Правила:
 *   N % 100 ∈ [11..14]  → forms[2]  (много)        — 11 дней, 14 дней
 *   N % 10 == 1         → forms[0]  (один)         — 1 день, 21 день
 *   N % 10 ∈ [2..4]     → forms[1]  (несколько)    — 2-4 дня, 22-24 дня
 *   иначе               → forms[2]  (много)        — 5-20 дней, 25-30 дней
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) | 0;
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/**
 * Шорткаты под частые случаи на сайте.
 */
export const pluralDays    = (n: number) => plural(n, ['день', 'дня', 'дней']);
export const pluralPlaces  = (n: number) => plural(n, ['место', 'места', 'мест']);
export const pluralKids    = (n: number) => plural(n, ['ребёнок', 'ребёнка', 'детей']);
export const pluralYears   = (n: number) => plural(n, ['год', 'года', 'лет']);
export const pluralHours   = (n: number) => plural(n, ['час', 'часа', 'часов']);
export const pluralMinutes = (n: number) => plural(n, ['минута', 'минуты', 'минут']);
