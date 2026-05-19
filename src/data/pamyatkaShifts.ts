// Конфиг смен для памятки: group_id из Альфа-CRM → CTA-данные.
// Если для смены нет TG-канала — CTA-блок не показывается совсем.
// Добавляй новые смены сюда; group_id берётся из CRM → Группы → URL содержит ?id=XXX.

export type PamyatkaShift = {
  groupId: number;
  num: string;
  name: string;
  dates: string;
  tg?: string;
  max?: string;
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
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  661: {
    groupId: 661,
    num: '2',
    name: '2 смена',
    dates: '10 июня – 16 июня 2026',
    tg: 'https://t.me/+oM_4iFtAjDFhMzdi',
    max: 'https://max.ru/join/YJdMcpP7WoOzLCE_SdYf1mg9V4t',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  // 661 done
  662: {
    groupId: 662,
    num: '3',
    name: '3 смена',
    dates: '16 июня – 23 июня 2026',
    tg: 'https://t.me/+oM_4iFtAjDFhMzdi',
    max: 'https://max.ru/join/YJdMcpP7WoOzLCE_SdYf1mg9V4t',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  663: {
    groupId: 663,
    num: '4',
    name: '4 смена',
    dates: '10 июня – 23 июня 2026',
    tg: 'https://t.me/+oM_4iFtAjDFhMzdi',
    max: 'https://max.ru/join/YJdMcpP7WoOzLCE_SdYf1mg9V4t',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
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
