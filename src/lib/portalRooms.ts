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
 * Единая «крыльевая» раскладка плана этажа — общая для инвентаризации и расселения,
 * чтобы план выглядел одинаково на обеих вкладках.
 *  Каждый этаж: массив рядов; ряд = левое крыло + пунктирный коридор + правое крыло.
 */
export const FLOOR_LAYOUT: Record<1 | 2, { title: string; rows: { left: number[]; right: number[] }[] }> = {
  1: {
    title: 'Этаж 1 · 22 места',
    rows: [
      { left: [20, 19, 18, 17], right: [11, 12, 13, 14] },
      { left: [21, 22], right: [16, 15] },
    ],
  },
  2: {
    title: 'Этаж 2 · 24 места',
    rows: [
      { left: [30, 31], right: [23, 24] },
      { left: [29, 28, 27], right: [26, 25] },
    ],
  },
};

export function getRoom(number: number): RoomDef | undefined {
  return ROOMS.find((r) => r.number === number);
}

export function roomsByFloor(floor: 1 | 2): RoomDef[] {
  return ROOMS.filter((r) => r.floor === floor).sort((a, b) => a.row - b.row || a.col - b.col);
}
