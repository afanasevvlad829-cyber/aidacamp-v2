import { mainShifts } from '../data/shifts';
import { getCurrentPrice } from '../data/dynamicPrices';

/** Опция смены для <select> калькуляторов. Цена/дни распарсены из строк shifts.ts. */
export interface ShiftOption {
  id: string;
  label: string;
  price: number;
  days: number;
  popular: boolean;
}

// Парсим цену из строки "74 900 ₽" и дни из "10 дней", чтобы не дублировать числа.
const parsePrice = (s: string) => parseInt(s.replace(/[^\d]/g, ''), 10) || 0;
const parseDays = (s: string) => parseInt(s, 10) || 0;

/**
 * Опции смен для калькуляторов вычета/выгоды.
 * Единый источник — data/shifts.ts (mainShifts). Не дублировать парсинг в компонентах.
 * price — ТЕКУЩАЯ цена по правилу роста (getCurrentPrice), не база: калькуляторы
 * считают скидку/вычет от неё на клиенте, база занижала бы весь расчёт.
 */
export function getShiftSelectOptions(): ShiftOption[] {
  return [...mainShifts].map((s) => ({
    id: s.id,
    label: `${s.name} — ${s.dates}, ${s.duration}`,
    price: getCurrentPrice(s.id) ?? parsePrice(s.price),
    days: parseDays(s.duration),
    popular: s.popular ?? false,
  }));
}
