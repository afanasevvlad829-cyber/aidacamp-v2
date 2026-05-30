/**
 * Data-layer для инвентаризации комнат 3-го корпуса.
 */

export interface RoomInventoryRow {
  id: number;
  shift_id: number;
  room_number: number;
  status: 'pending' | 'ok' | 'defects';
  inspected_by: number | null;
  inspected_at: string | null;
  walkthrough_photo_id: number | null;
  notes: string | null;
}

export interface RoomInventoryCheck {
  item_id: string;
  done: boolean;
  comment: string | null;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

/** Все записи по смене (по одной на комнату), отсортированы по room_number. */
export async function listInventoryByShift(shiftId: number): Promise<RoomInventoryRow[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, shift_id, room_number, status::text, inspected_by,
              to_char(inspected_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"') inspected_at,
              walkthrough_photo_id, notes
       FROM room_inventory WHERE shift_id=$1 ORDER BY room_number`,
      [shiftId],
    );
    return r.rows as RoomInventoryRow[];
  })) ?? [];
}

export async function getInventory(shiftId: number, roomNumber: number): Promise<{
  row: RoomInventoryRow | null;
  checks: RoomInventoryCheck[];
}> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, shift_id, room_number, status::text, inspected_by,
              to_char(inspected_at,'YYYY-MM-DD"T"HH24:MI:SS"Z"') inspected_at,
              walkthrough_photo_id, notes
       FROM room_inventory WHERE shift_id=$1 AND room_number=$2`,
      [shiftId, roomNumber],
    );
    const row = (r.rows[0] as RoomInventoryRow) ?? null;
    let checks: RoomInventoryCheck[] = [];
    if (row) {
      const cq = await c.query(
        `SELECT item_id, done, comment FROM room_inventory_check WHERE room_inventory_id=$1 ORDER BY item_id`,
        [row.id],
      );
      checks = cq.rows as RoomInventoryCheck[];
    }
    return { row, checks };
  })) ?? { row: null, checks: [] };
}

/** Гарантировать строку инвентаризации для (shift, room) — возвращает id. */
export async function ensureInventory(shiftId: number, roomNumber: number): Promise<number | null> {
  return await withClient(async (c) => {
    const r = await c.query(
      `INSERT INTO room_inventory(shift_id, room_number)
       VALUES($1,$2)
       ON CONFLICT (shift_id, room_number) DO UPDATE SET shift_id=EXCLUDED.shift_id
       RETURNING id`,
      [shiftId, roomNumber],
    );
    return r.rows[0].id as number;
  });
}

/** Поставить/снять галочку пункта чек-листа с опциональным комментарием. */
export async function toggleCheck(
  invId: number,
  itemId: string,
  done: boolean,
  comment: string | null,
): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `INSERT INTO room_inventory_check(room_inventory_id, item_id, done, comment, done_at)
       VALUES($1,$2,$3,$4, CASE WHEN $3 THEN now() ELSE NULL END)
       ON CONFLICT (room_inventory_id, item_id) DO UPDATE SET
         done=EXCLUDED.done,
         comment=COALESCE(EXCLUDED.comment, room_inventory_check.comment),
         done_at=EXCLUDED.done_at`,
      [invId, itemId, done, comment],
    );
  });
}

/** Обновить общий статус комнаты (вызывается после проставления галочек). */
export async function setStatus(
  invId: number,
  status: 'pending' | 'ok' | 'defects',
  inspectedBy: number,
): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `UPDATE room_inventory SET status=$2::room_inventory_status_enum, inspected_by=$3, inspected_at=now() WHERE id=$1`,
      [invId, status, inspectedBy],
    );
  });
}

/** Сохранить общий комментарий по приёмке комнаты (одно поле на комнату). */
export async function setNotes(invId: number, notes: string | null): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE room_inventory SET notes=$2 WHERE id=$1`, [invId, notes]);
  });
}

/** Привязать видео обхода (archive_photo.id). */
export async function attachWalkthrough(invId: number, photoId: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE room_inventory SET walkthrough_photo_id=$2 WHERE id=$1`, [invId, photoId]);
  });
}
