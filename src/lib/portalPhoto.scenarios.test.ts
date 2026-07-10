/**
 * Сценарные тесты portalPhoto — фото загружено → видно в списке → admin удалил.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({ default: { Client: vi.fn(() => client), Pool: vi.fn(() => ({ connect: vi.fn(async () => client), on: vi.fn() })) } }));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('Фото-архив — сценарий загрузки → выдачи → удаления', () => {
  it('insertPhoto возвращает id + file_url', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /INSERT INTO archive_photo/.test(sql) ? { rows: [{ id: 101, file_url: '/portal/uploads/foo/bar.jpg' }], rowCount: 1 } : null],
    });
    const { insertPhoto } = await import('./portalPhoto');
    const r = await insertPhoto({
      event_id: 5, author_telegram_id: 999, file_type: 'photo',
      mime: 'image/jpeg', size_bytes: 12345, storage_kind: 'local',
      file_path: '/foo/bar.jpg', file_url: '/portal/uploads/foo/bar.jpg',
    });
    expect(r.id).toBe(101);
    expect(r.file_url).toBe('/portal/uploads/foo/bar.jpg');
  });

  it('listPhotosByEvent возвращает массив фото по событию', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /archive_photo/.test(sql) && /event_id\s*=\s*\$1/.test(sql) ? {
        rows: [{ id: 101, event_id: 5, author_telegram_id: 999, file_url: '/x.jpg', file_type: 'photo' }],
        rowCount: 1,
      } : null],
    });
    const { listPhotosByEvent } = await import('./portalPhoto');
    const rows = await listPhotosByEvent(5);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(101);
  });

  it('lookupAuthorNames возвращает Map<telegram_id, name>', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /telegram_id = ANY/.test(sql) ? {
        rows: [{ telegram_id: 999, name: 'Александр Ташкин' }, { telegram_id: 500, name: 'Варвара' }],
        rowCount: 2,
      } : null],
    });
    const { lookupAuthorNames } = await import('./portalPhoto');
    const m = await lookupAuthorNames([999, 500]);
    expect(m.get(999)).toBe('Александр Ташкин');
    expect(m.get(500)).toBe('Варвара');
  });

  it('deletePhotoRow удаляет и возвращает true если строка была', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /DELETE FROM archive_photo/.test(sql) ? { rows: [], rowCount: 1 } : null],
    });
    const { deletePhotoRow } = await import('./portalPhoto');
    expect(await deletePhotoRow(101)).toBe(true);
  });

  it('deletePhotoRow возвращает false если строки не было', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /DELETE FROM archive_photo/.test(sql) ? { rows: [], rowCount: 0 } : null],
    });
    const { deletePhotoRow } = await import('./portalPhoto');
    expect(await deletePhotoRow(404)).toBe(false);
  });

  it('setContentTaskCompleted переводит задачу в completed', async () => {
    const { setContentTaskCompleted } = await import('./portalPhoto');
    await setContentTaskCompleted(5, 'meal.menu_close', 999);
    const upd = client.calls.find((c) => /UPDATE event_content_task/.test(c.sql));
    expect(upd).toBeTruthy();
    expect(upd!.params).toEqual([5, 'meal.menu_close', 999]);
  });
});
