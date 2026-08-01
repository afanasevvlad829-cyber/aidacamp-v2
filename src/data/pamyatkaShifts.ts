// Конфиг смен для памятки: group_id из Альфа-CRM → CTA-данные.
// TG и Max ссылки берутся динамически из поля note группы в CRM (getGroupLinks).
// Здесь только статика: даты, телефон менеджера.
// group_id берётся из CRM → Группы → URL содержит ?id=XXX.
// Даты и названия августовских смен НЕ дублируем — тянем из shifts.ts,
// единственного источника правды (иначе поймаем страж check:dates).
import { mainShifts, SEASON_YEAR } from './shifts';

const _byId = (id: string) => mainShifts.find((s) => s.id === id);
const _s3 = _byId('shift-3');
const _s4 = _byId('shift-4');

export type PamyatkaShift = {
  groupId: number;
  num: string;
  name: string;
  dates: string;
  // tg и max подгружаются динамически из поля note группы в Альфа-CRM (getGroupLinks)
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
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  661: {
    groupId: 661,
    num: '2',
    name: '2 смена',
    dates: '10 июня – 16 июня 2026',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  662: {
    groupId: 662,
    num: '3',
    name: '3 смена',
    dates: '16 июня – 23 июня 2026',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  663: {
    groupId: 663,
    num: '4',
    name: '4 смена',
    dates: '10 июня – 23 июня 2026',
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  // 664 и 665 в CRM названы «5 СМЕНА» и «6 СМЕНА», но родителям показываем
  // привычную нумерацию из shifts.ts — «Смена 3» и «Смена 4».
  664: {
    groupId: 664,
    num: '3',
    name: _s3?.name ?? 'Смена 3',
    dates: `${_s3?.dates ?? ''} ${SEASON_YEAR}`,
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
  665: {
    groupId: 665,
    num: '4',
    name: _s4?.name ?? 'Смена 4',
    dates: `${_s4?.dates ?? ''} ${SEASON_YEAR}`,
    manager: 'Progaschool',
    phone: '+79688086455',
    phoneDisplay: '+7 (968) 808-64-55',
  },
};

export function pickPamyatkaShift(groupIds: number[] | null | undefined): PamyatkaShift | null {
  if (!groupIds || !groupIds.length) return null;
  for (const gid of groupIds) {
    if (PAMYATKA_SHIFTS[gid]) return PAMYATKA_SHIFTS[gid];
  }
  return null;
}
