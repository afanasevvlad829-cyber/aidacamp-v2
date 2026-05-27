/**
 * Data-layer для модуля расселения.
 * Хранение: room_assignment(shift_id, kid_id, kid_name, kid_gender, kid_age, room_number, bed_index, notes).
 * Один ребёнок ∈ shift_id уникален (UNIQUE shift_id+kid_id).
 * Одна койка (shift+room+bed) занята максимум одним ребёнком.
 */

export interface RoomAssignment {
  id: number;
  shift_id: number;
  kid_id: string;
  kid_name: string;
  kid_gender: 'M' | 'F' | null;
  kid_age: number | null;
  notes: string | null;
  room_number: number | null;
  bed_index: number | null;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

/** Все назначения для смены (включая нерасселённых). */
export async function listAssignments(shiftId: number): Promise<RoomAssignment[]> {
  return (await withClient(async (c) => {
    const r = await c.query(
      `SELECT id, shift_id, kid_id, kid_name, kid_gender, kid_age, notes, room_number, bed_index
       FROM room_assignment WHERE shift_id=$1 ORDER BY kid_name`,
      [shiftId],
    );
    return r.rows as RoomAssignment[];
  })) ?? [];
}

/**
 * Создать или обновить ребёнка. Если room_number+bed_index — расселяем; null — снимаем с койки.
 * Если на нужной койке уже кто-то — освобождаем её перед записью (kid → не расселён).
 */
export async function upsertKid(input: {
  shift_id: number;
  kid_id: string;
  kid_name: string;
  kid_gender?: 'M' | 'F' | null;
  kid_age?: number | null;
  notes?: string | null;
  room_number?: number | null;
  bed_index?: number | null;
}): Promise<{ id: number; bumped_kid_id: string | null } | null> {
  return await withClient(async (c) => {
    await c.query('BEGIN');
    let bumped: string | null = null;
    try {
      // Если хотим посадить на конкретную койку — освободить её сначала.
      if (input.room_number != null && input.bed_index != null) {
        const occ = await c.query(
          `SELECT kid_id FROM room_assignment
           WHERE shift_id=$1 AND room_number=$2 AND bed_index=$3 AND kid_id <> $4`,
          [input.shift_id, input.room_number, input.bed_index, input.kid_id],
        );
        if (occ.rows[0]) {
          bumped = occ.rows[0].kid_id;
          await c.query(
            `UPDATE room_assignment SET room_number=NULL, bed_index=NULL, updated_at=now()
             WHERE shift_id=$1 AND kid_id=$2`,
            [input.shift_id, bumped],
          );
        }
      }

      const r = await c.query(
        `INSERT INTO room_assignment(shift_id, kid_id, kid_name, kid_gender, kid_age, notes, room_number, bed_index)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (shift_id, kid_id) DO UPDATE SET
           kid_name = EXCLUDED.kid_name,
           kid_gender = COALESCE(EXCLUDED.kid_gender, room_assignment.kid_gender),
           kid_age = COALESCE(EXCLUDED.kid_age, room_assignment.kid_age),
           notes = COALESCE(EXCLUDED.notes, room_assignment.notes),
           room_number = EXCLUDED.room_number,
           bed_index = EXCLUDED.bed_index,
           updated_at = now()
         RETURNING id`,
        [
          input.shift_id, input.kid_id, input.kid_name,
          input.kid_gender ?? null, input.kid_age ?? null, input.notes ?? null,
          input.room_number ?? null, input.bed_index ?? null,
        ],
      );
      await c.query('COMMIT');
      return { id: r.rows[0].id as number, bumped_kid_id: bumped };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    }
  });
}

/** Удалить ребёнка полностью из реестра расселения. */
export async function deleteKid(shiftId: number, kidId: string): Promise<boolean> {
  const ok = await withClient(async (c) => {
    const r = await c.query(
      'DELETE FROM room_assignment WHERE shift_id=$1 AND kid_id=$2',
      [shiftId, kidId],
    );
    return (r.rowCount ?? 0) > 0;
  });
  return ok ?? false;
}
