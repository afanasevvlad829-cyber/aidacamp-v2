/**
 * ЕДИНСТВЕННЫЙ источник правды для всех цен смен.
 *
 * Архитектура: явные ценовые ступени + необязательный ежедневный инкремент.
 *
 * Каждая ступень (PriceStage) задаёт:
 *   from      — дата начала ступени (YYYY-MM-DD)
 *   price     — базовая цена ступени
 *   increment — (опц.) рост цены в ₽/день; работает до начала следующей ступени
 *
 * Примеры:
 *   { from: '2026-05-23', price: 99000, increment: 500 }
 *     → 23 мая: 99 000, 24 мая: 99 500, 25 мая: 100 000, ...
 *     → останавливается, когда наступает следующая ступень
 *
 *   { from: '2026-06-20', price: 109000 }
 *     → фиксированная цена «последние места», инкремент отсутствует
 *
 * Чтобы изменить цену — добавь ступень в stages и задеплой.
 */

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

// ─── Конфигурация всех смен ────────────────────────────────────────────────
export const PRICING: Record<string, ShiftPricing> = {

  // Смена 1 (30 мая — 8 июня, 10 дней)
  // Цена поднималась ступенями, сейчас на максимуме 93 900
  'shift-1': {
    days: 10,
    stages: [
      { from: '2026-01-01', price: 74900 },
      { from: '2026-04-01', price: 79900 },
      { from: '2026-05-01', price: 85900 },
      { from: '2026-05-23', price: 85900, increment: 1000 }, // +1 000/день
      { from: '2026-05-28', price: 93900 },                  // максимум, фиксируем
    ],
    fortune: { discountPct: 7, depositPct: 30 },
  },

  // Смена 2 (10 июня — 23 июня, 14 дней)
  // Сейчас в режиме инкремента +500/день от базы 99 000 с 23 мая
  'shift-2': {
    days: 14,
    stages: [
      { from: '2026-01-01', price: 95000 },
      { from: '2026-04-01', price: 99000 },
      { from: '2026-05-23', price: 99000, increment: 500 }, // +500/день
      // Пример «последние места»:
      // { from: '2026-06-15', price: 115000 }, // фиксированная, инкремент останавливается
    ],
    fortune: { discountPct: 7, depositPct: 30 },
  },

  // Смена 3 (3–15 августа, 13 дней)
  // До 30 июня: 89 400
  // С 1 июля: +500/день
  // 3 августа (день старта): фиксируем 105 900 ₽ — рост останавливается
  'shift-3': {
    days: 13,
    stages: [
      { from: '2026-01-01', price: 89400 },
      { from: '2026-07-01', price: 89400, increment: 500 }, // +500/день
      { from: '2026-08-03', price: 105900 },                // старт смены — рост остановлен
    ],
  },

  // Смена 4 (17–26 августа, 10 дней)
  // До 10 июля: 74 900
  // С 10 июля: +300/день
  // 17 августа (день старта): фиксируем 86 300 ₽ — рост останавливается
  'shift-4': {
    days: 10,
    stages: [
      { from: '2026-01-01', price: 74900 },
      { from: '2026-07-10', price: 74900, increment: 300 }, // +300/день
      { from: '2026-08-17', price: 86300 },                 // старт смены — рост остановлен
    ],
  },

  'shift-2-1': {
    days: 7,
    stages: [
      { from: '2026-01-01', price: 48000 },
    ],
  },

  'shift-2-2': {
    days: 8,
    stages: [
      { from: '2026-01-01', price: 75000 },
    ],
  },
};

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
  return cfg.stages.find(s => s.from > todayStr) ?? null;
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
  const eduPart = price - 3800 * days;
  return eduPart > 0 ? Math.round(eduPart * 0.13) : 0;
}

/** Форматирует цену: 93900 → "93 900 ₽" */
export function fmtPrice(n: number): string {
  return n.toLocaleString('ru-RU') + ' ₽';
}
