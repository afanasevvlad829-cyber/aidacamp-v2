/**
 * Хардкод-карта 3-го корпуса санатория «Изумруд» — 22 комнаты на 1-м этаже + 24 на 2-м (включая горничную №22).
 * Корпус не меняется. Координаты — для CSS Grid (col×row) визуальной шахматки на странице инвентаризации.
 */

export type RoomType = 'standard' | 'standard_2_3' | 'lux' | 'staff';

export interface RoomDef {
  number: number;
  floor: 1 | 2;
  type: RoomType;
  capacity: number; // максимум мест (0 для staff)
  label: string;    // короткий человекочитаемый тип
  // grid-координаты на шахматке (col 1-based, row 1-based)
  col: number;
  row: number;
}

/**
 * Сетка floor 1: 4 строки grid с разрывом по середине (col 5 — пустая).
 *  row 1: №20 №19 №18 №17 . №11 №12 №13 №14
 *  row 2:   .    .   .   .  .   .    .    .   .   (gap)
 *  row 3: №21 №22       .       №16 №15
 */
export const ROOMS: RoomDef[] = [
  // ───────── Floor 1 (22 places, включая горничную №22) ─────────
  { number: 20, floor: 1, type: 'standard_2_3', capacity: 2, label: '2-3-х местная', col: 1, row: 1 },
  { number: 19, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 2, row: 1 },
  { number: 18, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 3, row: 1 },
  { number: 17, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 4, row: 1 },
  { number: 11, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 6, row: 1 },
  { number: 12, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 7, row: 1 },
  { number: 13, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 8, row: 1 },
  { number: 14, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 9, row: 1 },

  { number: 21, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 1, row: 2 },
  { number: 22, floor: 1, type: 'staff',        capacity: 0, label: 'горничная',     col: 2, row: 2 },
  { number: 16, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 7, row: 2 },
  { number: 15, floor: 1, type: 'standard',     capacity: 2, label: '2-х местная',   col: 8, row: 2 },

  // ───────── Floor 2 (24 places) ─────────
  // Грид 8 колонок: 3 левых + коридор (col 4) + 4 правых
  // Люксы (верх) каждый шире 2-местных (низ): 30 spans 1-1, 31 spans 2-3; 23 spans 5-6, 24 spans 7-8
  { number: 30, floor: 2, type: 'lux',          capacity: 2, label: 'ЛЮКС 2-х местная', col: 1, row: 1 },
  { number: 31, floor: 2, type: 'lux',          capacity: 4, label: 'ЛЮКС 4-х местная', col: 2, row: 1 },
  { number: 23, floor: 2, type: 'lux',          capacity: 4, label: 'ЛЮКС 4-х местная', col: 5, row: 1 },
  { number: 24, floor: 2, type: 'lux',          capacity: 4, label: 'ЛЮКС 4-х местная', col: 7, row: 1 },

  { number: 29, floor: 2, type: 'standard',     capacity: 2, label: '2-х местная',     col: 1, row: 2 },
  { number: 28, floor: 2, type: 'standard',     capacity: 2, label: '2-х местная',     col: 2, row: 2 },
  { number: 27, floor: 2, type: 'standard',     capacity: 2, label: '2-х местная',     col: 3, row: 2 },
  { number: 26, floor: 2, type: 'standard',     capacity: 2, label: '2-х местная',     col: 5, row: 2 },
  { number: 25, floor: 2, type: 'standard',     capacity: 2, label: '2-х местная',     col: 7, row: 2 },
];

/** Чек-лист инвентаризации (6 пунктов). */
export const INVENTORY_CHECKLIST = [
  { id: 'overview', text: 'Общий вид и чистота' },
  { id: 'plumbing', text: 'Сантехника: вода, душ, унитаз — работают' },
  { id: 'electric', text: 'Электрика: все розетки и лампы в исправном состоянии' },
  { id: 'beds',     text: 'Кровати: ножки, каркас, матрасы — поднимали и осмотрели' },
  { id: 'walls',    text: 'Стены, потолок, занавески — без повреждений' },
  { id: 'video',    text: 'Видео обхода комнаты загружено (обязательно)' },
] as const;

/**
 * Точная grid-раскладка плана 3-го корпуса — общая для инвентаризации и расселения,
 * чтобы план совпадал с реальным чертежом и выглядел одинаково на обеих вкладках.
 *
 * Сетка 9 колонок: cols 1-4 = левое крыло, col 5 = коридор, cols 6-9 = правое крыло.
 *  col — CSS grid-column (с диапазоном для широких комнат), row — номер ряда.
 *  Этаж 1: верхний ряд — узкие 2-местные (1 колонка), нижний — широкие (2 колонки).
 *  Этаж 2: верхний ряд — люксы (2 колонки), нижний — 2-местные; №27 стоит по центру (коридор).
 */
export interface FloorCell { n: number; col: string; row: number; }
export const FLOOR_GRID: Record<1 | 2, { title: string; cols: number; rowsTemplate: string; cells: FloorCell[] }> = {
  1: {
    title: 'Этаж 1 · 22 места',
    cols: 9,
    rowsTemplate: 'minmax(96px, auto) minmax(120px, auto)',
    cells: [
      { n: 20, col: '1', row: 1 }, { n: 19, col: '2', row: 1 }, { n: 18, col: '3', row: 1 }, { n: 17, col: '4', row: 1 },
      { n: 11, col: '6', row: 1 }, { n: 12, col: '7', row: 1 }, { n: 13, col: '8', row: 1 }, { n: 14, col: '9', row: 1 },
      { n: 21, col: '1 / 3', row: 2 }, { n: 22, col: '3 / 5', row: 2 },
      { n: 16, col: '6 / 8', row: 2 }, { n: 15, col: '8 / 10', row: 2 },
    ],
  },
  2: {
    title: 'Этаж 2 · 24 места',
    cols: 9,
    rowsTemplate: 'minmax(120px, auto) minmax(110px, auto)',
    cells: [
      { n: 30, col: '1 / 3', row: 1 }, { n: 31, col: '3 / 5', row: 1 },
      { n: 23, col: '6 / 8', row: 1 }, { n: 24, col: '8 / 10', row: 1 },
      { n: 29, col: '1 / 3', row: 2 }, { n: 28, col: '3 / 5', row: 2 },
      { n: 27, col: '5 / 6', row: 2 },
      { n: 26, col: '6 / 8', row: 2 }, { n: 25, col: '8 / 10', row: 2 },
    ],
  },
};

export function getRoom(number: number): RoomDef | undefined {
  return ROOMS.find((r) => r.number === number);
}

/** Проверяет ручное назначение койки до записи в БД. Null/null означает «не расселён». */
export function validateRoomPlacement(roomNumber: number | null, bedIndex: number | null): string | null {
  if (roomNumber == null && bedIndex == null) return null;
  if (roomNumber == null || bedIndex == null) return 'room_number and bed_index must be set together';
  if (!Number.isInteger(roomNumber) || !Number.isInteger(bedIndex)) return 'room_number and bed_index must be integers';

  const room = getRoom(roomNumber);
  if (!room || room.type === 'staff' || room.capacity <= 0) return 'room unavailable for accommodation';
  if (bedIndex < 0 || bedIndex >= room.capacity) return 'bed_index outside room capacity';
  return null;
}

export function roomsByFloor(floor: 1 | 2): RoomDef[] {
  return ROOMS.filter((r) => r.floor === floor).sort((a, b) => a.row - b.row || a.col - b.col);
}
