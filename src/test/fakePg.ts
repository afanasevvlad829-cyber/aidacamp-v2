/**
 * Минимальный мок pg.Client для сценарных тестов.
 * Регистрируешь карту SQL→ответ; в тесте делаешь vi.mock('pg', ...) с этим клиентом.
 *
 * Пример:
 *   const client = makeFakeClient({
 *     handlers: [
 *       (sql, params) => sql.startsWith('SELECT id') ? { rows: [{id: 7}], rowCount: 1 } : null,
 *     ],
 *   });
 *   vi.doMock('pg', () => ({ default: { Client: vi.fn(() => client) } }));
 */
import { vi } from 'vitest';

type QueryResult = { rows: any[]; rowCount?: number };
type Handler = (sql: string, params?: any[]) => QueryResult | null;

export interface FakeClient {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  query: ReturnType<typeof vi.fn>;
  /** Все выполненные запросы (для проверок). */
  calls: { sql: string; params: any[] | undefined }[];
}

export function makeFakeClient(opts: { handlers?: Handler[]; defaultResult?: QueryResult } = {}): FakeClient {
  const { handlers = [], defaultResult = { rows: [], rowCount: 0 } } = opts;
  const calls: { sql: string; params: any[] | undefined }[] = [];
  const query = vi.fn(async (sql: string, params?: any[]) => {
    calls.push({ sql, params });
    for (const h of handlers) {
      const r = h(sql, params);
      if (r) return r;
    }
    return defaultResult;
  });
  return {
    connect: vi.fn(async () => {}),
    end: vi.fn(async () => {}),
    query,
    calls,
  };
}

/** Удобная мокирующая обёртка: импорт pg → ваш fake-клиент. */
export function mockPgModule(client: FakeClient) {
  vi.doMock('pg', () => ({
    default: { Client: vi.fn(() => client) },
  }));
}
