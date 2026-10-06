import { describe, it, expect } from 'vitest';
import { searchCorporateBenefits } from './corporate-benefits';
import { corporateCompanies } from '../data/corporate-benefits';
import type { CorporateCompany } from '../data/corporate-benefits';
const fixture: CorporateCompany[] = [{ name: 'Тестовая Компания', aliases: ['ТестРаботодатель'], programs: [{ name: 'BestBenefits', sourceAsOf: '2026-10-02', offerUrl: 'https://bestbenefits.ru/product/8024' }] }];
describe('informational employer lookup', () => {
  it('does not claim there are no benefits when no record is found', () => {
    expect(searchCorporateBenefits('Компания', []).status).toBe('unknown');
  });
  it('returns possible membership only, with the offer link', () => {
    const result = searchCorporateBenefits('Компания', fixture);
    expect(result.status).toBe('possible');
    expect(result.companies[0].programs[0].offerUrl).toBe('https://bestbenefits.ru/product/8024');
    expect(result.companies[0]).not.toHaveProperty('inn');
    expect(result.companies[0].programs[0]).not.toHaveProperty('compensation');
  });
  it('matches aliases, quotation marks, case, dots and hyphens', () => {
    expect(searchCorporateBenefits('«ТЕСТОВАЯ компания»', fixture).status).toBe('possible');
    expect(searchCorporateBenefits('тестработодатель', fixture).status).toBe('possible');
    for (const q of ['Т Банк', 'Т-Банк', 'Тинькофф', 'М Видео', 'М.Видео', 'Самолёт', 'J&J', 'T1', 'Вайлдберриз']) expect(searchCorporateBenefits(q).status).toBe('possible');
  });
  it('rejects numbers and empty or oversized queries', () => {
    for (const q of ['', 'а', '---', '7700000000', 'а'.repeat(121)]) expect(searchCorporateBenefits(q, fixture).status).toBe('invalid');
  });
  it('covers all 61 named brands and does not infer PremiumCode employers from suppliers', () => {
    expect(corporateCompanies).toHaveLength(61);
    for (const c of corporateCompanies) {
      const result = searchCorporateBenefits(c.name);
      expect(result.status).toBe('possible');
      expect(result.companies[0].name).toBe(c.name);
    }
    for (const q of ['Hoff', 'Медси', 'Lamoda', 'World Class']) expect(searchCorporateBenefits(q).status).toBe('unknown');
  });
  it('limits ambiguous results to twenty brands', () => {
    const many = Array.from({ length: 21 }, (_, i) => ({ ...fixture[0], name: `Компания ${i}` }));
    const result = searchCorporateBenefits('Компания', many);
    expect(result.companies).toHaveLength(20);
    expect(result.truncated).toBe(true);
  });
});
