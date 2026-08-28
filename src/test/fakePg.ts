/**
 * Минимальный мок pg.Client для сценарных тестов.
 * Регистрируешь карту SQL→ответ; в тесте делаешь vi.mock('pg', ...) с этим клиентом.
 *
 * db.ts берёт клиента через pool.connect() (не new pg.Client() напрямую) — поэтому
 * мок должен покрывать и Pool: используй mockPgModule(client) или скопируй
 * fakePgModuleFactory(client) в свой vi.mock('pg', () => fakePgModuleFactory(client)).
 *
 * Пример:
 *   const client = makeFakeClient({
 *     handlers: [
 *       (sql, params) => sql.startsWith('SELECT id') ? { rows: [{id: 7}], rowCount: 1 } : null,
 *     ],
 *   });
 *   vi.doMock('pg', () => fakePgModuleFactory(client));
 */
import { vi } from 'vitest';

type QueryResult = { rows: any[]; rowCount?: number };
type Handler = (sql: string, params?: any[]) => QueryResult | null;

export interface FakeClient {
  connect: () => Promise<void>;
  end: () => Promise<void>;
  release: () => void;
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
    release: vi.fn(),
    query,
    calls,
  };
}

/** Фабрика для vi.mock('pg', () => fakePgModuleFactory(client)) — покрывает Client и Pool.connect(). */
export function fakePgModuleFactory(client: FakeClient) {
  return {
    default: {
      Client: vi.fn(() => client),
      Pool: vi.fn(() => ({ connect: vi.fn(async () => client), on: vi.fn() })),
    },
  };
}

/** Удобная мокирующая обёртка: импорт pg → ваш fake-клиент. */
export function mockPgModule(client: FakeClient) {
  vi.doMock('pg', () => fakePgModuleFactory(client));
}
