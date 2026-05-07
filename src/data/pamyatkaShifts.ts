// Конфиг смен для памятки: group_id из Альфа-CRM → CTA-данные.
// Если для смены нет TG-канала — CTA-блок не показывается совсем.
// Добавляй новые смены сюда; group_id берётся из CRM → Группы → URL содержит ?id=XXX.

export type PamyatkaShift = {
  groupId: number;
  num: string;
  name: string;
  dates: string;
  tg?: string;
  manager?: string;
  phone?: string;
  phoneDisplay?: string;
};

export const PAMYATKA_SHIFTS: Record<number, PamyatkaShift> = {
  660: {
    groupId: 660,
    num: '1',
    name: '1 смена',
    dates: '30 мая – 8 июня 2026',
    tg: 'https://t.me/+lHP-2IyCPSI5NDcy',
  },
  // 661: {…2 смена…},
  // 662: {…3 смена…},
  // 663: {…4 смена…},
  // 664: {…5 смена…},
  // 665: {…6 смена…},
};

export function pickPamyatkaShift(groupIds: number[] | null | undefined): PamyatkaShift | null {
  if (!groupIds || !groupIds.length) return null;
  for (const gid of groupIds) {
    if (PAMYATKA_SHIFTS[gid]) return PAMYATKA_SHIFTS[gid];
  }
  return null;
}
