export interface EconomySettings {
  kids: number; days: number; phoneMin: number;
  markup: number; round: number; daily: number; targetExtract: number;
}

export const DEFAULT_ECONOMY_SETTINGS: EconomySettings = {
  kids: 35, days: 10, phoneMin: 10, markup: 3, round: 50, daily: 600, targetExtract: 75,
};

export const CAT_LABELS: Record<string, string> = {
  phone: 'Телефон', fun: 'Развлечения', food: 'Еда', prize: 'Физ. приз',
  privilege: 'Привилегии', comfort: 'Комфорт', service: 'Услуги', other: 'Прочее',
};

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function dailyPotential(s: EconomySettings): number {
  return s.daily;
}

export function recommendedBongere(ozonPrice: number, s: EconomySettings): number {
  return roundTo(ozonPrice * s.markup, s.round);
}

export function saveDays(price: number, potential: number): number {
  if (!price || price <= 0 || potential <= 0) return 0;
  return Math.ceil(price / potential);
}

export interface ShiftFunds {
  dp: number; dailyFund: number; total: number;
  targetExtract: number; perKid: number; phoneEquiv: number;
}
export function shiftFunds(s: EconomySettings): ShiftFunds {
  const dp = dailyPotential(s);
  const dailyFund = s.kids * dp;
  const total = dailyFund * s.days;
  return {
    dp, dailyFund, total,
    targetExtract: total * (s.targetExtract / 100),
    perKid: dp * s.days,
    phoneEquiv: s.phoneMin > 0 ? Math.floor(dp / s.phoneMin) : 0,
  };
}

export interface ActivityInput {
  participants: number; dp: number;
  targetDays: number | null; targetShare: number | null; basePrice: number | null;
}
export function activityRecommended(a: ActivityInput, round: number): { value: number; formula: string } {
  if (a.targetDays && a.targetShare) {
    const raw = a.participants * a.dp * a.targetDays * (a.targetShare / 100);
    return { value: roundTo(raw, round), formula: `${a.participants} × ${a.dp} × ${a.targetDays}д × ${a.targetShare}%` };
  }
  if (a.basePrice != null && !Number.isNaN(a.basePrice)) {
    return { value: Number(a.basePrice), formula: 'фикс.' };
  }
  return { value: 0, formula: '—' };
}

export function effectivePrice(custom: number | null, recommended: number): number {
  return (custom != null && !Number.isNaN(custom)) ? custom : recommended;
}

export function perPerson(price: number, participants: number, round: number): number {
  return participants > 0 ? roundTo(price / participants, round) : price;
}

export function extractPct(price: number, totalShiftFund: number): number {
  return totalShiftFund > 0 ? (price / totalShiftFund) * 100 : 0;
}
