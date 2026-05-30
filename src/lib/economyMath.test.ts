import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ECONOMY_SETTINGS, roundTo, dailyPotential, recommendedBongere,
  saveDays, shiftFunds, activityRecommended, effectivePrice, perPerson, extractPct,
} from './economyMath';

const s = { ...DEFAULT_ECONOMY_SETTINGS }; // kids:35,days:10,phoneMin:10,markup:3,round:50,daily:600,targetExtract:75

describe('roundTo', () => {
  it('округляет к шагу', () => {
    expect(roundTo(123, 50)).toBe(100);
    expect(roundTo(125, 50)).toBe(150);
    expect(roundTo(0, 50)).toBe(0);
  });
});

describe('dailyPotential', () => {
  it('= daily', () => expect(dailyPotential(s)).toBe(600));
});

describe('recommendedBongere', () => {
  it('= roundTo(ozon*markup, round)', () => {
    expect(recommendedBongere(100, s)).toBe(300);     // 100*3=300 → 300
    expect(recommendedBongere(133, s)).toBe(400);     // 399 → 400
  });
});

describe('saveDays', () => {
  it('ceil(price/potential), 0 при невалидных', () => {
    expect(saveDays(1200, 600)).toBe(2);
    expect(saveDays(1300, 600)).toBe(3);              // ceil(2.16)
    expect(saveDays(0, 600)).toBe(0);
    expect(saveDays(500, 0)).toBe(0);
  });
});

describe('shiftFunds', () => {
  it('фонды смены', () => {
    const f = shiftFunds(s);
    expect(f.dp).toBe(600);
    expect(f.dailyFund).toBe(21000);                  // 35*600
    expect(f.total).toBe(210000);                     // 21000*10
    expect(f.targetExtract).toBe(157500);             // 210000*0.75
    expect(f.perKid).toBe(6000);                      // 600*10
    expect(f.phoneEquiv).toBe(60);                    // floor(600/10)
  });
});

describe('activityRecommended', () => {
  it('по формуле когда заданы targetDays и targetShare', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: 2, targetShare: 50, basePrice: null }, 50);
    expect(r.value).toBe(21000);                      // 35*600*2*0.5=21000
    expect(r.formula).toBe('35 × 600 × 2д × 50%');
  });
  it('фикс. цена когда формулы нет', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: null, targetShare: null, basePrice: 5000 }, 50);
    expect(r.value).toBe(5000);
    expect(r.formula).toBe('фикс.');
  });
  it('0 когда ничего не задано', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: null, targetShare: null, basePrice: null }, 50);
    expect(r.value).toBe(0);
  });
});

describe('effectivePrice / perPerson / extractPct', () => {
  it('effectivePrice: custom при наличии, иначе recommended', () => {
    expect(effectivePrice(1500, 2000)).toBe(1500);
    expect(effectivePrice(null, 2000)).toBe(2000);
    expect(effectivePrice(NaN, 2000)).toBe(2000);
  });
  it('perPerson', () => {
    expect(perPerson(21000, 35, 50)).toBe(600);
    expect(perPerson(1000, 0, 50)).toBe(1000);
  });
  it('extractPct', () => {
    expect(extractPct(21000, 210000)).toBeCloseTo(10);
    expect(extractPct(1000, 0)).toBe(0);
  });
});
