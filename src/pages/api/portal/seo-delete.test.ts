import { describe, it, expect, vi, beforeEach } from 'vitest';

// Мокаем слой БД: withDbClient получает fn и вызывает её с фейковым клиентом,
// у которого query — шпион. Так проверяем, что SQL параметризован (keyword
// уходит ОТДЕЛЬНЫМ параметром, а не в текст запроса).
const querySpy = vi.fn(async () => ({ rows: [] }));
const withDbClientMock = vi.fn(async (fn: (c: any) => Promise<any>) => {
  return fn({ query: querySpy });
});

vi.mock('../../../lib/db', () => ({
  withDbClient: (...args: any[]) => (withDbClientMock as any)(...args),
}));

import { POST } from './seo-delete';

function makeCtx(body: unknown, locals: Record<string, unknown>): any {
  return {
    request: new Request('http://localhost/api/portal/seo-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    locals,
  };
}

describe('POST /api/portal/seo-delete', () => {
  beforeEach(() => {
    querySpy.mockClear();
    withDbClientMock.mockClear();
  });

  it('без portalRole возвращает 401 и не трогает БД', async () => {
    const res = await POST(makeCtx({ keyword: 'foo' }, {}));
    expect(res.status).toBe(401);
    expect(withDbClientMock).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('вредоносный keyword уходит параметром, а не в текст SQL (защита от инъекции)', async () => {
    const evil = '"; DROP TABLE seo_keywords; --';
    const res = await POST(makeCtx({ keyword: evil }, { portalRole: 'admin' }));
    expect(res.status).toBe(200);
    expect(withDbClientMock).toHaveBeenCalledTimes(1);

    // Собираем все вызовы query
    const calls = querySpy.mock.calls as Array<[string, unknown[]?]>;
    const sqls = calls.map((c) => c[0]);

    // Транзакция обёрнута BEGIN/COMMIT
    expect(sqls).toContain('BEGIN');
    expect(sqls).toContain('COMMIT');

    // DELETE-запросы передают keyword ИМЕННО как параметр [$1], а не в тексте SQL
    const deleteCalls = calls.filter((c) => typeof c[0] === 'string' && c[0].startsWith('DELETE'));
    expect(deleteCalls.length).toBe(2);
    for (const [sql, params] of deleteCalls) {
      expect(sql).toContain('keyword = $1');
      // Вредоносная строка НЕ должна попасть в текст SQL
      expect(sql).not.toContain('DROP TABLE');
      expect(sql).not.toContain(evil);
      // и ДОЛЖНА быть передана отдельным параметром
      expect(params).toEqual([evil]);
    }
  });

  it('невалидный keyword (не строка) → 400 без обращения к БД', async () => {
    const res = await POST(makeCtx({ keyword: 123 }, { portalRole: 'admin' }));
    expect(res.status).toBe(400);
    expect(withDbClientMock).not.toHaveBeenCalled();
  });
});
