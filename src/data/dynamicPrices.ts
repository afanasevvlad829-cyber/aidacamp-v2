/**
 * ЕДИНЫЙ ИСТОЧНИК ПРАВИЛА ЦЕН смен.
 *
 * Данные (база/дата/длительность) берутся из ОДНОГО места — `SHIFT_META` в shifts.ts.
 * Здесь — только ПРАВИЛО, как из базовой цены получается текущая.
 *
 * ─── ЕДИНОЕ ПРАВИЛО РОСТА (для всех смен одинаковое) ───────────────────────
 *   1. До «старт − 30 дней» цена = базовой.
 *   2. За 30 дней до старта — разовый шаг +5 % к базе.
 *   3. Далее каждый день +500 ₽.
 *   4. На дату старта смены рост ОСТАНАВЛИВАЕТСЯ (цена фиксируется).
 *
 *   Цена на старте = round(base × 1.05) + 30 × 500.
 *
 * ─── ПРАВИЛО ЗАПУСКА ФОРТУНЫ ───────────────────────────────────────────────
 *   Колесо фортуны (скидка на последние места) запускается в ПОСЛЕДНИЕ 3 ДНЯ
 *   перед стартом смены И только когда осталось ≤ 3 свободных мест.
 *   Источник истины — функция isFortuneActive() ниже.
 *
 * Параметры правил — константы RAMP_DAYS / STEP_PCT / DAILY_INC /
 * FORTUNE_WINDOW_DAYS / FORTUNE_LAST_SPOTS ниже.
 * Чтобы изменить цену/дату смены — правь shifts.ts (НЕ здесь).
 * Чтобы изменить сами правила — правь константы здесь.
 */

import { SHIFT_META, taxDeduction, fmtRub } from './shifts.ts';

interface PriceStage {
  from: string;        // YYYY-MM-DD
  price: number;       // базовая цена ступени
  increment?: number;  // ₽/день (опц.)
}

interface ShiftPricing {
  days: number;
  stages: PriceStage[]; // отсортированы по дате (возрастание)

  fortune?: {
    discountPct: number;  // скидка от текущей цены, %
    depositPct:  number;  // доля предоплаты от финальной цены, %
  };
}

// ─── Параметры единого правила роста ───────────────────────────────────────
const RAMP_DAYS = 30;     // за сколько дней до старта начинается рост
const STEP_PCT  = 0.05;   // разовый шаг в начале роста: +5 %
const DAILY_INC = 500;    // далее ₽/день

// ─── Параметры правила запуска фортуны ──────────────────────────────────────
const FORTUNE_WINDOW_DAYS = 3;  // за сколько дней до старта запускается фортуна
const FORTUNE_LAST_SPOTS  = 3;  // на сколько последних мест

// Fortune-скидки (колесо фортуны) — только у смен, где она включена.
const FORTUNE: Record<string, { discountPct: number; depositPct: number }> = {
  'shift-1': { discountPct: 7, depositPct: 30 },
  'shift-2': { discountPct: 7, depositPct: 30 },
};

// ─── Сдвиг ISO-даты на N дней (для границы начала роста) ────────────────────
function isoShift(iso: string, deltaDays: number): string {
  const dt = new Date(iso + 'T00:00:00Z');
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Строит ступени из базовой цены и даты старта по ЕДИНОМУ правилу:
 *   base → (старт−30д: +5%) → +500/день → фиксация на старте.
 */
function buildStages(basePrice: number, startDate: string): PriceStage[] {
  const rampFrom = isoShift(startDate, -RAMP_DAYS);
  const stepped  = Math.round(basePrice * (1 + STEP_PCT)); // +5 % к базе
  const atStart  = stepped + RAMP_DAYS * DAILY_INC;        // цена на старте (фиксируется)
  return [
    { from: '2026-01-01', price: basePrice },                 // база держится
    { from: rampFrom,     price: stepped, increment: DAILY_INC }, // +5 %, далее +500/день
    { from: startDate,    price: atStart },                   // фиксация на старте
  ];
}

// ─── PRICING строится из SHIFT_META (единый источник данных) + правила ──────
export const PRICING: Record<string, ShiftPricing> = Object.fromEntries(
  Object.entries(SHIFT_META).map(([id, m]) => [
    id,
    {
      days: m.days,
      stages: buildStages(m.basePrice, m.startDate),
      ...(FORTUNE[id] ? { fortune: FORTUNE[id] } : {}),
    },
  ]),
);

// ─── Вспомогательные функции ───────────────────────────────────────────────

function daysDiff(fromStr: string, toDate: Date): number {
  const from = new Date(fromStr + 'T00:00:00');
  const to   = new Date(toDate);
  to.setHours(0, 0, 0, 0);
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

function todayISO(today: Date): string {
  return today.toISOString().slice(0, 10);
}

// ─── Публичные функции ─────────────────────────────────────────────────────

/** Текущая цена смены с учётом ежедневного инкремента. */
export function getCurrentPrice(shiftId: string, today: Date = new Date()): number | null {
  const cfg = PRICING[shiftId];
  if (!cfg) return null;

  const stages   = cfg.stages;
  const todayStr = todayISO(today);

  // Находим индекс активной ступени (последняя с from <= today)
  let activeIdx = -1;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].from <= todayStr) activeIdx = i;
  }
  if (activeIdx === -1) return null;

  const stage = stages[activeIdx];

  if (stage.increment) {
    // Инкремент действует с from до начала следующей ступени (или до сегодня)
    const nextStage  = stages[activeIdx + 1];
    const limitStr   = nextStage ? nextStage.from : todayStr;
    const capStr     = limitStr <= todayStr ? limitStr : todayStr;
    const elapsed    = daysDiff(stage.from, new Date(capStr));
    return stage.price + elapsed * stage.increment;
  }

  return stage.price;
}

/** Цена следующего дня (для «Завтра будет X ₽»). null если цена уже не растёт. */
export function getNextDayPrice(shiftId: string, today: Date = new Date()): number | null {
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowPrice = getCurrentPrice(shiftId, tomorrow);
  const todayPrice    = getCurrentPrice(shiftId, today);
  if (!tomorrowPrice || !todayPrice) return null;
  return tomorrowPrice > todayPrice ? tomorrowPrice : null;
}

/** Следующая плановая ступень цены (дата + цена). null если следующей ступени нет. */
export function getNextPriceStage(shiftId: string, today: Date = new Date()): { from: string; price: number } | null {
  const cfg = PRICING[shiftId];
  if (!cfg) return null;
  const todayStr = todayISO(today);
  const next = cfg.stages.find(s => s.from > todayStr);
  return next ? { from: next.from, price: next.price } : null;
}

/** Цена со скидкой фортуны и сумма депозита. */
export function getFortunePrice(shiftId: string, today: Date = new Date()): { final: number; deposit: number } | null {
  const cfg  = PRICING[shiftId];
  const base = getCurrentPrice(shiftId, today);
  if (!cfg?.fortune || !base) return null;
  const final   = Math.round(base * (1 - cfg.fortune.discountPct / 100));
  const deposit = Math.round(final * cfg.fortune.depositPct / 100);
  return { final, deposit };
}

/**
 * Запущена ли фортуна для смены.
 * ПРАВИЛО: последние 3 дня перед стартом (0…3 дня до старта) И ≤ 3 свободных мест.
 * freeSpots — текущее число свободных мест (источник — shifts.ts, поле free).
 */
export function isFortuneActive(shiftId: string, freeSpots: number, today: Date = new Date()): boolean {
  const m = SHIFT_META[shiftId];
  if (!m) return false;
  const start    = new Date(m.startDate + 'T00:00:00');
  const todayMid = new Date(today);
  todayMid.setHours(0, 0, 0, 0);
  const daysUntilStart = Math.ceil((start.getTime() - todayMid.getTime()) / 86_400_000);
  const inWindow  = daysUntilStart >= 0 && daysUntilStart <= FORTUNE_WINDOW_DAYS;
  const lastSpots = freeSpots > 0 && freeSpots <= FORTUNE_LAST_SPOTS;
  return inWindow && lastSpots;
}

/** Фаза смены по датам: предстоит → идёт → прошла. Единый источник статуса. */
export type ShiftPhase = 'upcoming' | 'live' | 'done';
export function getShiftPhase(shiftId: string, today: Date = new Date()): ShiftPhase | null {
  const m = SHIFT_META[shiftId];
  if (!m) return null;
  const start = new Date(m.startDate + 'T00:00:00');
  const end   = new Date(m.endDate + 'T23:59:59');
  if (today < start) return 'upcoming';
  if (today > end)   return 'done';
  return 'live';
}

/** Длительность смены в днях. */
export function getDays(shiftId: string): number {
  return PRICING[shiftId]?.days ?? 0;
}

/**
 * Налоговый вычет: 13% от образовательной части.
 * Образовательная часть = цена − 3 800 ₽/день (проживание/питание).
 */
export function getTaxDeduction(shiftId: string, today: Date = new Date()): number {
  const price = getCurrentPrice(shiftId, today);
  const days  = getDays(shiftId);
  if (!price || !days) return 0;
  // Единый источник формулы — taxDeduction() в shifts.ts (константы EDU_RESID_PER_DAY/
  // NDFL_RATE + лимит EDU_BASE_CAP). Не дублировать формулу здесь.
  return taxDeduction(price, days);
}

/** Форматирует цену: 93900 → "93 900 ₽". Формат — из shifts.ts, не дублируем. */
export function fmtPrice(n: number): string {
  return fmtRub(n);
}
