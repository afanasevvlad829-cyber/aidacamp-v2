import { describe, it, expect } from 'vitest';

// Тест проверяет что getPool возвращает null если нет DSN (singleton без утечки)
describe('getPool', () => {
  it('возвращает null если нет DSN', async () => {
    delete process.env.AIDAPLUS_PG_DSN;
    delete process.env.PG_DSN;
    // Сбрасываем модульный кэш чтобы переменная pool была null
    const mod = await import('./db?test_' + Date.now());
    expect(mod.getPool()).toBeNull();
  });
});
