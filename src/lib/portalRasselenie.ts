/**
 * Data-layer для модуля расселения.
 * Хранение: room_assignment(shift_id, kid_id, kid_name, kid_gender, kid_age, room_number, bed_index, notes).
 * Один ребёнок ∈ shift_id уникален (UNIQUE shift_id+kid_id).
 * Одна койка (shift+room+bed) занята максимум одним ребёнком.
 */
import { withDbClient } from './db';

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

/** Сохранить снимок текущего расселения смены (резерв перед массовыми операциями). */
export async function takeSnapshot(shiftId: number, reason: string): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(
      `INSERT INTO room_assignment_snapshot(shift_id, reason, snapshot_data)
       SELECT $1, $2, COALESCE(jsonb_agg(row_to_json(ra)), '[]'::jsonb)
       FROM room_assignment ra WHERE ra.shift_id = $1`,
      [shiftId, reason],
    );
  });
}

/** Все назначения для смены (включая нерасселённых). */
export async function listAssignments(shiftId: number): Promise<RoomAssignment[]> {
  return (await withDbClient(async (c) => {
    // Для записей staff-{id} берём актуальное имя из portal_staff.
    // kid_name остаётся fallback если запись была удалена из portal_staff.
    const r = await c.query(
      `SELECT ra.id, ra.shift_id, ra.kid_id,
              CASE
                WHEN ra.kid_id LIKE 'staff-%' AND ps.full_name IS NOT NULL
                THEN ps.full_name || ' (' || COALESCE(
                  CASE ps.role
                    WHEN 'admin'       THEN 'Админ'
                    WHEN 'rukovoditel' THEN 'Руководитель'
                    WHEN 'teacher'     THEN 'Преподаватель'
                    WHEN 'vozhaty'     THEN 'Вожатый'
                    WHEN 'student'     THEN 'Участник'
                    ELSE ps.role
                  END, ps.role, ra.kid_name) || ')'
                ELSE ra.kid_name
              END AS kid_name,
              ra.kid_gender, ra.kid_age, ra.notes, ra.room_number, ra.bed_index
       FROM room_assignment ra
       LEFT JOIN portal_staff ps
         ON ra.kid_id LIKE 'staff-%'
        AND ps.id = CAST(SUBSTRING(ra.kid_id FROM 7) AS INTEGER)
       WHERE ra.shift_id=$1
       ORDER BY kid_name`,
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
  /** Если true — при конфликте НЕ перезаписывать room_number/bed_index (загрузка из CRM). */
  preservePosition?: boolean;
}): Promise<{ id: number; bumped_kid_id: string | null } | null> {
  const posClause = input.preservePosition
    ? `room_number = COALESCE(EXCLUDED.room_number, room_assignment.room_number),
           bed_index   = COALESCE(EXCLUDED.bed_index,   room_assignment.bed_index),`
    : `room_number = EXCLUDED.room_number,
           bed_index   = EXCLUDED.bed_index,`;
  return await withDbClient(async (c) => {
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
           kid_name   = EXCLUDED.kid_name,
           kid_gender = COALESCE(EXCLUDED.kid_gender, room_assignment.kid_gender),
           kid_age    = COALESCE(EXCLUDED.kid_age,    room_assignment.kid_age),
           notes      = COALESCE(EXCLUDED.notes,      room_assignment.notes),
           ${posClause}
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

/** Снять всех детей с коек (комнаты обнуляются, дети остаются в реестре). */
export async function resetAssignmentsForShift(shiftId: number): Promise<number> {
  await takeSnapshot(shiftId, 'reset_all');
  const n = await withDbClient(async (c) => {
    const r = await c.query(
      `UPDATE room_assignment SET room_number=NULL, bed_index=NULL, updated_at=now()
       WHERE shift_id=$1 AND (room_number IS NOT NULL OR bed_index IS NOT NULL)`,
      [shiftId],
    );
    return r.rowCount ?? 0;
  });
  return n ?? 0;
}

/**
 * Авто-расстановка:
 *  — Свободные дети сортируются по полу+возрасту.
 *  — Для каждого выбирается лучшая комната: тот же пол (или пустая), близкий возраст (±3 года),
 *    не нарушаем capacity. Score: совпадение пола +5, есть соседи +2, пожелания не учитываем (нет пока).
 *  — Уже расселённых не трогаем.
 */
const AGE_SPREAD = 3;
export interface AutoAssignRoomDef { number: number; capacity: number; }
export async function autoAssign(shiftId: number, rooms: AutoAssignRoomDef[]): Promise<{ assigned: number; skipped: number }> {
  await takeSnapshot(shiftId, 'auto_assign');
  const items = await listAssignments(shiftId);
  // Карта занятости коек и текущие жильцы по комнате
  const occByRoom = new Map<number, RoomAssignment[]>();
  const occBed = new Set<string>(); // "room:bed"
  const unassigned: RoomAssignment[] = [];
  for (const a of items) {
    if (a.room_number != null && a.bed_index != null) {
      occBed.add(`${a.room_number}:${a.bed_index}`);
      const arr = occByRoom.get(a.room_number) ?? [];
      arr.push(a);
      occByRoom.set(a.room_number, arr);
    } else {
      unassigned.push(a);
    }
  }

  // Сортируем нерасселённых по полу (девочки→мальчики) + возрасту
  unassigned.sort((a, b) => {
    const ga = a.kid_gender === 'F' ? 0 : a.kid_gender === 'M' ? 1 : 2;
    const gb = b.kid_gender === 'F' ? 0 : b.kid_gender === 'M' ? 1 : 2;
    return ga - gb || (a.kid_age ?? 99) - (b.kid_age ?? 99);
  });

  let assigned = 0, skipped = 0;

  for (const kid of unassigned) {
    let bestRoom: number | null = null;
    let bestBed = -1;
    let bestScore = -1;

    for (const room of rooms) {
      const occ = occByRoom.get(room.number) ?? [];
      // Найти первую свободную койку
      let freeBed = -1;
      for (let i = 0; i < room.capacity; i++) {
        if (!occBed.has(`${room.number}:${i}`)) { freeBed = i; break; }
      }
      if (freeBed < 0) continue;

      // Пол: если в комнате уже есть жильцы другого пола — пропускаем
      const genders = new Set(occ.map((o) => o.kid_gender).filter((g) => g === 'M' || g === 'F'));
      if (kid.kid_gender && genders.size > 0 && !genders.has(kid.kid_gender)) continue;
      // Если в комнате уже смешано — пропускаем тоже
      if (genders.size > 1) continue;

      // Возраст: проверяем общий разброс
      const ages = occ.map((o) => o.kid_age).filter((x): x is number => x != null);
      if (kid.kid_age != null && ages.length > 0) {
        const minA = Math.min(...ages, kid.kid_age);
        const maxA = Math.max(...ages, kid.kid_age);
        if (maxA - minA > AGE_SPREAD) continue;
      }

      // Score: совпадение пола +5, компактность (есть соседи) +2, иначе базовый 10
      let score = 10;
      if (kid.kid_gender && genders.has(kid.kid_gender)) score += 5;
      if (occ.length > 0) score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestRoom = room.number;
        bestBed = freeBed;
      }
    }

    if (bestRoom != null && bestBed >= 0) {
      await upsertKid({
        shift_id: shiftId,
        kid_id: kid.kid_id,
        kid_name: kid.kid_name,
        kid_gender: kid.kid_gender,
        kid_age: kid.kid_age,
        room_number: bestRoom,
        bed_index: bestBed,
      });
      occBed.add(`${bestRoom}:${bestBed}`);
      const arr = occByRoom.get(bestRoom) ?? [];
      arr.push({ ...kid, room_number: bestRoom, bed_index: bestBed });
      occByRoom.set(bestRoom, arr);
      assigned++;
    } else {
      skipped++;
    }
  }

  return { assigned, skipped };
}

/** Полная очистка списка детей смены (удаляем все записи). */
export async function wipeKidsForShift(shiftId: number): Promise<number> {
  await takeSnapshot(shiftId, 'wipe_all');
  const n = await withDbClient(async (c) => {
    const r = await c.query('DELETE FROM room_assignment WHERE shift_id=$1', [shiftId]);
    return r.rowCount ?? 0;
  });
  return n ?? 0;
}

/** Удалить ребёнка полностью из реестра расселения. */
export async function deleteKid(shiftId: number, kidId: string): Promise<boolean> {
  const ok = await withDbClient(async (c) => {
    const r = await c.query(
      'DELETE FROM room_assignment WHERE shift_id=$1 AND kid_id=$2',
      [shiftId, kidId],
    );
    return (r.rowCount ?? 0) > 0;
  });
  return ok ?? false;
}
