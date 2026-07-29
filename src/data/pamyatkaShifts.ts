// Конфиг смен для памятки: group_id из Альфа-CRM → CTA-данные.
// TG и Max ссылки берутся динамически из поля note группы в CRM (getGroupLinks).
// Даты — производные от shifts.ts (SHIFT_META/shiftDatesFull), не хардкодить строками.
// group_id берётся из CRM → Группы → URL содержит ?id=XXX.

import { allShiftsIncludingArchived, shiftDatesFull, SEASON_YEAR } from './shifts';

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

// CRM group_id → id смены на сайте. ⚠️ Нумерация CRM ≠ нумерации сайта:
// «2 смена» CRM = сайтовая Смена 2.1, «3 смена» CRM = 2.2, «4 смена» CRM = 2 — сверено по датам.
const GROUP_TO_SHIFT: Record<number, string> = {
  660: 'shift-1',
  661: 'shift-2-1',
  662: 'shift-2-2',
  663: 'shift-2',
  // 664/665 подтверждены в CRM UI 2026-07-29 (владелец): «5 СМЕНА (03.08.2026 - 15.08.2026)»
  // и «6 СМЕНА (17.08.2026 - 26.08.2026)» — даты совпадают с shift-3/shift-4 в shifts.ts.
  664: 'shift-3',
  665: 'shift-4',
};

const MANAGER = { manager: 'Progaschool', phone: '+79688086455', phoneDisplay: '+7 (968) 808-64-55' };
const _byId = Object.fromEntries(allShiftsIncludingArchived.map((s) => [s.id, s]));

export const PAMYATKA_SHIFTS: Record<number, PamyatkaShift> = Object.fromEntries(
  Object.entries(GROUP_TO_SHIFT).map(([gidStr, shiftId], i) => {
    const gid = Number(gidStr);
    const num = String(i + 1); // номер в CRM-нумерации
    return [
      gid,
      {
        groupId: gid,
        num,
        name: `${num} смена`,
        dates: `${shiftDatesFull(_byId[shiftId])} ${SEASON_YEAR}`,
        ...MANAGER,
      },
    ];
  }),
);

export function pickPamyatkaShift(groupIds: number[] | null | undefined): PamyatkaShift | null {
  if (!groupIds || !groupIds.length) return null;
  for (const gid of groupIds) {
    if (PAMYATKA_SHIFTS[gid]) return PAMYATKA_SHIFTS[gid];
  }
  return null;
}
