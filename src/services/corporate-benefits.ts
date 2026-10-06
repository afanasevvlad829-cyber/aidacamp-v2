import { corporateCompanies, type CorporateCompany } from '../data/corporate-benefits';

const normalize = (value: string) => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Совпадение со списком брендов — подсказка проверить доступ у HR, не авторизация. */
export function searchCorporateBenefits(query: string, companies: CorporateCompany[] = corporateCompanies) {
  const q = normalize(query);
  if (q.length < 2 || query.length > 120 || !/\p{L}/u.test(q)) {
    return { status: 'invalid' as const, message: 'Введите название компании (от 2 символов).', companies: [] };
  }
  const matches = companies.map(c => ({ company: c, names: [c.name, ...c.aliases].map(normalize) }))
    .filter(c => c.names.some(name => name.includes(q)))
    .sort((a, b) => Number(b.names.includes(q)) - Number(a.names.includes(q)) || a.company.name.localeCompare(b.company.name, 'ru'));
  return {
    status: matches.length ? 'possible' as const : 'unknown' as const,
    companies: matches.slice(0, 20).map(({ company }) => ({ name: company.name, programs: company.programs })),
    truncated: matches.length > 20,
  };
}
