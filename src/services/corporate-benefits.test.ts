import { describe, expect, it } from 'vitest';
import { searchCorporateBenefits } from './corporate-benefits';

describe('corporate employer directory', () => {
  it('does not infer platform membership for a well-known brand', () => {
    const result = searchCorporateBenefits('Сбер');
    expect(result.status).toBe('possible');
    expect(result.companies.find(c => c.name === 'Сбер')?.programs).toEqual([]);
  });
  it('retains the supplied employer program and offer', () => {
    expect(searchCorporateBenefits('Озон').companies[0]).toMatchObject({
      name: 'Ozon', programs: [{ name: 'BestBenefits', offerUrl: 'https://bestbenefits.ru/product/8024' }],
    });
  });
  it('retains evidence for newly sourced program mentions', () => {
    expect(searchCorporateBenefits('Positive Technologies').companies[0]).toMatchObject({
      name: 'Positive Technologies', programs: [{ sourceUrl: 'https://career.habr.com/companies/bestbenefits' }],
    });
  });
  it('keeps numeric identifiers outside this name-only search', () => {
    expect(searchCorporateBenefits('7701234567').status).toBe('invalid');
  });
  it('limits broad queries and preserves the no-match state', () => {
    const result = searchCorporateBenefits('газ');
    expect(result.companies.length).toBeLessThanOrEqual(20);
    expect(searchCorporateBenefits('НесуществующаяКомпанияXYZ').status).toBe('unknown');
  });
});
