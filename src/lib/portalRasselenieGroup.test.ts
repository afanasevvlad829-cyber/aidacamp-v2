import { describe, expect, it, vi } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

const client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({
  default: {
    Client: vi.fn(() => client),
    Pool: vi.fn(() => ({ connect: vi.fn(async () => client), on: vi.fn() })),
  },
}));

const { inferGenderFromName, groupOf } = await import('./portalRasselenie');

describe('пол по ФИО', () => {
  it('берёт отчество — самый надёжный признак', () => {
    expect(inferGenderFromName('Григорьева Людмила Дмитриевна')).toBe('F');
    expect(inferGenderFromName('Балтунов Ярослав Владимирович')).toBe('M');
    expect(inferGenderFromName('Жейда Динияр Семенович')).toBe('M');
  });

  it('падает на фамилию, когда отчества нет', () => {
    expect(inferGenderFromName('Гусаковская Алена')).toBe('F');
    expect(inferGenderFromName('Гущин Лука')).toBe('M');
  });

  it('не гадает, когда признаков нет', () => {
    expect(inferGenderFromName('Денисенко Женя')).toBeNull();
    expect(inferGenderFromName('')).toBeNull();
  });

  it('игнорирует служебную приписку роли', () => {
    expect(inferGenderFromName('Мухортова Варвара Сергеевна (Вожатый)')).toBe('F');
  });
});

describe('группа для расселения', () => {
  const kid = (kid_name: string, kid_gender: string | null = null) =>
    ({ kid_id: 'alfa-1', kid_name, kid_gender } as any);

  it('персонал — всегда отдельная группа, независимо от имени', () => {
    expect(groupOf({ kid_id: 'staff-13', kid_name: 'Варвара Мухортова', kid_gender: null } as any)).toBe('STAFF');
  });

  it('имя перевешивает ошибочный пол из CRM', () => {
    // Реальный случай 02.08.2026: обе девочки числились в CRM мальчиками.
    expect(groupOf(kid('Гусаковская Алена Ивановна', 'M'))).toBe('F');
    expect(groupOf(kid('Фомичева Ангелада Викторовна', 'M'))).toBe('F');
  });

  it('использует пол из CRM, когда по имени не разобрать', () => {
    expect(groupOf(kid('Денисенко Женя', 'F'))).toBe('F');
  });

  it('без обоих признаков — отдельная группа, а не «к мальчикам»', () => {
    expect(groupOf(kid('Денисенко Женя', null))).toBe('U');
  });
});
