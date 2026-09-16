/**
 * Промокоды — ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ.
 *
 * Код, размер скидки, название партнёра и текст плашки живут только здесь.
 * НЕ дублировать «8%» или «AIDATRANSFER» в компонентах — иначе повторится
 * история с ценами и трансфером, где одно и то же число разъезжалось по
 * файлам и правки расходились (см. CLAUDE.md → критичные инварианты).
 *
 * Скидка применяется к цене путёвки. Трансфер по промокоду бесплатный —
 * его штатная цена берётся из TRANSFER_PRICE в shifts.ts, здесь не хардкодим.
 */

export interface Promo {
  /** Код в каноническом виде (верхний регистр, без пробелов). */
  code: string;
  /** Партнёр, от которого условия — для плашки «специальные условия от …». */
  partner: string;
  /** Скидка на путёвку, %. 0 — если промокод даёт только трансфер. */
  discountPct: number;
  /** Трансфер бесплатный по этому коду. */
  freeTransfer: boolean;
}

/**
 * Действующие промокоды. Ключ — канонический код (верхний регистр).
 * Новый партнёр = новая запись здесь, правок в компонентах не требуется.
 */
export const PROMOS: Record<string, Promo> = {
  AIDATRANSFER: {
    code: 'AIDATRANSFER',
    partner: 'Best Benefits',
    discountPct: 8,
    freeTransfer: true,
  },
};

/** Приводит ввод пользователя к каноническому виду: обрезает пробелы, поднимает регистр. */
export function normalizePromo(input: string): string {
  return (input || '').trim().replace(/\s+/g, '').toUpperCase();
}

/** Промокод по вводу пользователя, либо null если такого нет. */
export function findPromo(input: string): Promo | null {
  return PROMOS[normalizePromo(input)] ?? null;
}

/** Цена со скидкой промокода, округлённая до рубля. Без промокода — исходная цена. */
export function priceWithPromo(price: number, promo: Promo | null): number {
  if (!promo || promo.discountPct <= 0) return price;
  return Math.round(price * (1 - promo.discountPct / 100));
}

/**
 * Что даёт промокод — списком, для плашки в форме.
 * Порядок как в договорённости с партнёром: сначала трансфер, потом скидка.
 */
export function promoBenefits(promo: Promo): string[] {
  const out: string[] = [];
  if (promo.freeTransfer) out.push('бесплатный трансфер');
  if (promo.discountPct > 0) out.push(`скидка ${promo.discountPct}%`);
  return out;
}

/** Заголовок плашки: «У вас специальные условия от Best Benefits». */
export function promoTitle(promo: Promo): string {
  return `У вас специальные условия от ${promo.partner}`;
}

/** Строка выгод для плашки: «бесплатный трансфер и скидка 8%». */
export function promoBenefitsLine(promo: Promo): string {
  const b = promoBenefits(promo);
  if (b.length <= 1) return b[0] ?? '';
  return b.slice(0, -1).join(', ') + ' и ' + b[b.length - 1];
}

/**
 * Примечание для CRM и Telegram — тем же путём, что у Колеса фортуны
 * (поле note_extra в /api/lead), поэтому новых колонок в БД не нужно.
 */
export function promoCrmNote(promo: Promo, priceRub?: number): string {
  const parts = [`🎫 Промокод ${promo.code} (${promo.partner}): ${promoBenefitsLine(promo)}`];
  if (priceRub && promo.discountPct > 0) {
    const final = priceWithPromo(priceRub, promo);
    parts.push(`итоговая цена ${final.toLocaleString('ru')} ₽ (было ${priceRub.toLocaleString('ru')} ₽)`);
  }
  return parts.join(', ');
}
