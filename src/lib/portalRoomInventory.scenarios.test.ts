/**
 * Сценарные тесты portalRoomInventory — полный поток инвентаризации одной комнаты.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeFakeClient, type FakeClient } from '../test/fakePg';

let client: FakeClient = makeFakeClient();
vi.mock('pg', () => ({ default: { Client: vi.fn(() => client) } }));

beforeEach(() => {
  process.env.AIDAPLUS_PG_DSN = 'postgres://fake/aidacamp';
  client = makeFakeClient();
});

describe('Инвентаризация комнаты — сценарий', () => {
  it('ensureInventory возвращает id', async () => {
    client = makeFakeClient({
      handlers: [(sql) => /INSERT INTO room_inventory/.test(sql) ? { rows: [{ id: 42 }], rowCount: 1 } : null],
    });
    const { ensureInventory } = await import('./portalRoomInventory');
    const id = await ensureInventory(1, 20);
    expect(id).toBe(42);
  });

  it('toggleCheck посылает UPSERT с правильными параметрами', async () => {
    const { toggleCheck } = await import('./portalRoomInventory');
    await toggleCheck(42, 'plumbing', true, 'кран немного капает');
    const upsert = client.calls.find((c) => /INSERT INTO room_inventory_check/.test(c.sql));
    expect(upsert).toBeTruthy();
    expect(upsert!.params).toEqual([42, 'plumbing', true, 'кран немного капает']);
  });

  it('setStatus обновляет статус и фиксирует inspected_by/at', async () => {
    const { setStatus } = await import('./portalRoomInventory');
    await setStatus(42, 'defects', 12345);
    const upd = client.calls.find((c) => /UPDATE room_inventory SET status/.test(c.sql));
    expect(upd).toBeTruthy();
    expect(upd!.params).toEqual([42, 'defects', 12345]);
  });

  it('attachWalkthrough привязывает photo_id к строке инвентаризации', async () => {
    const { attachWalkthrough } = await import('./portalRoomInventory');
    await attachWalkthrough(42, 777);
    const upd = client.calls.find((c) => /walkthrough_photo_id=\$2/.test(c.sql));
    expect(upd).toBeTruthy();
    expect(upd!.params).toEqual([42, 777]);
  });
});
