import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock pg module
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();
const mockRelease = vi.fn();
const clientInstance = { connect: mockConnect, query: mockQuery, end: mockEnd, release: mockRelease };
const MockClient = vi.fn(() => clientInstance);
// db.ts берёт клиента из pool.connect() (не new pg.Client() напрямую) — мокаем Pool так же.
const MockPool = vi.fn(() => ({ connect: vi.fn(async () => clientInstance), on: vi.fn() }));

vi.mock('pg', () => ({ default: { Client: MockClient, Pool: MockPool } }));

// Re-import after mock is registered
const { insertPhoto, listPhotosByEvent, setContentTaskCompleted, listEventContentTasks } =
  await import('./portalPhoto');

beforeEach(() => {
  vi.resetAllMocks();
  process.env.AIDAPLUS_PG_DSN = 'postgresql://test/test';
  mockConnect.mockResolvedValue(undefined);
  mockEnd.mockResolvedValue(undefined);
});

describe('insertPhoto', () => {
  it('вставляет запись и возвращает id + file_url', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 42, file_url: '/portal/uploads/1/2026-06-01/ev-1/uuid.jpg' }],
    });

    const result = await insertPhoto({
      event_id: 1,
      author_telegram_id: 123456789,
      file_type: 'photo',
      mime: 'image/jpeg',
      width: 1200,
      height: 900,
      size_bytes: 204800,
      storage_kind: 'local',
      file_path: '1/2026-06-01/ev-1/uuid.jpg',
      file_url: '/portal/uploads/1/2026-06-01/ev-1/uuid.jpg',
    });

    expect(result.id).toBe(42);
    expect(result.file_url).toBe('/portal/uploads/1/2026-06-01/ev-1/uuid.jpg');
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO archive_photo/);
    expect(params[0]).toBe(1);   // event_id
    expect(params[2]).toBe(123456789); // author_telegram_id
    expect(params[6]).toBe('photo');   // file_type
  });

  it('throws если DSN не задан', async () => {
    delete process.env.AIDAPLUS_PG_DSN;
    delete process.env.PG_DSN;
    await expect(
      insertPhoto({
        event_id: 1, author_telegram_id: 1, file_type: 'photo',
        mime: 'image/jpeg', size_bytes: 1024,
        storage_kind: 'local', file_path: 'test.jpg',
      }),
    ).rejects.toThrow('DB not available');
  });
});

describe('listPhotosByEvent', () => {
  it('возвращает список фото для события', async () => {
    const fakePhotos = [
      { id: 1, event_id: 5, author_telegram_id: 100, file_type: 'photo', uploaded_at: '2026-06-01T10:00:00Z' },
    ];
    mockQuery.mockResolvedValueOnce({ rows: fakePhotos });

    const result = await listPhotosByEvent(5);
    expect(result).toHaveLength(1);
    expect(result[0].event_id).toBe(5);
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE event_id = \$1/);
    expect(params[0]).toBe(5);
  });

  it('возвращает [] при ошибке DSN', async () => {
    delete process.env.AIDAPLUS_PG_DSN;
    delete process.env.PG_DSN;
    const result = await listPhotosByEvent(1);
    expect(result).toEqual([]);
  });
});

describe('setContentTaskCompleted', () => {
  it('вызывает UPDATE с правильными параметрами', async () => {
    mockQuery.mockResolvedValueOnce({ rowCount: 1 });
    await setContentTaskCompleted(10, 'meal.menu_close', 555);
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE event_content_task/);
    expect(params[0]).toBe(10);
    expect(params[1]).toBe('meal.menu_close');
    expect(params[2]).toBe(555);
  });
});

describe('listEventContentTasks', () => {
  it('возвращает [] при пустом массиве eventIds', async () => {
    const result = await listEventContentTasks([]);
    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('джойнит content_task_template', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ event_id: 1, template_id: 'meal.menu_close', status: 'pending', brief: 'Сделай фото', content_type: 'photo', title: 'Меню' }],
    });
    const result = await listEventContentTasks([1, 2]);
    expect(result).toHaveLength(1);
    expect(result[0].template_id).toBe('meal.menu_close');
    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/JOIN content_task_template/);
    expect(params[0]).toEqual([1, 2]);
  });
});
