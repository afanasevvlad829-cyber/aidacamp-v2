/**
 * Данные смен АйДаКемп — единый источник правды.
 * Используется в Shifts.astro (frontmatter) и в client-side script (через JSON script tag).
 */

/**
 * Год текущего сезона — используется в маркетинговой прозе (заголовки, meta, FAQ:
 * «летний лагерь ${SEASON_YEAR}», «цены на ${SEASON_YEAR} год»).
 * При переходе на новый год смен — меняется ТОЛЬКО здесь.
 *
 * НЕ путать с ISO-датами смен (startDate/endDate в SHIFT_META) — они не зависят
 * от этой константы и обновляются отдельно, когда добавляются новые смены.
 * НЕ использовать для исторических фактов (дата публикации статьи, дата отзыва,
 * год основания компании, дата сбора парсенных данных) — там нужен реальный год события.
 */
export const SEASON_YEAR = 2026;

export interface Shift {
  id: string;
  name: string;
  dates: string;
  duration: string;
  status: string;
  statusType: 'available' | 'short';
  description: string;
  price: string;
  free: number;
  occupied: number;
  highlighted?: boolean;
  nearest?: boolean;   // ближайшая смена — особый акцент
  popular?: boolean;
  startDate: string; // YYYY-MM-DD for calendar
  endDate: string;
  recapUrl?: string;   // ссылка «Смотреть как прошла» (для завершённых; нет → без кнопки)
  priceFrom?: string;  // первая цена для блока «как росла цена» (legacy-факт; нет → из правила)
  priceTo?: string;    // последняя цена (на старте) для блока «как росла цена»
}

/**
 * Единый расчёт доступности смены — вместо дублирования порога 85% в каждом компоненте.
 * free <= 0 → распродано (лист ожидания); occupied% >= 85 → мало мест; иначе — места есть.
 */
export type AvailabilityLevel = 'available' | 'low' | 'soldout';

export function getAvailabilityLevel(shift: Pick<Shift, 'free' | 'occupied'>): AvailabilityLevel {
  if (shift.free <= 0) return 'soldout';
  const total = shift.occupied + shift.free;
  const pct = total > 0 ? Math.round((shift.occupied / total) * 100) : 0;
  return pct >= 85 ? 'low' : 'available';
}

export function getAvailabilityLabel(shift: Pick<Shift, 'free' | 'occupied'>): string {
  const level = getAvailabilityLevel(shift);
  if (level === 'soldout') return 'Мест нет';
  if (level === 'low') return 'Мало мест';
  return 'Места есть';
}

/**
 * Единая точка правды для текста и поведения кнопки брони.
 * soldout → «Лист ожидания» (та же форма, помечена isWaitlist для CRM/попапа-объяснения).
 */
export function getBookingCta(shift: Pick<Shift, 'free' | 'occupied'>): { label: string; isWaitlist: boolean } {
  const isWaitlist = getAvailabilityLevel(shift) === 'soldout';
  return { label: isWaitlist ? 'Лист ожидания' : 'Забронировать', isWaitlist };
}

/**
 * Значок смены для кружка в шапке карточки — ЕДИНЫЙ источник для всех карточек.
 * Летние смены нумерованные (shift-3, shift-2-1) → «3», «2.1».
 * Межсезонные номера не имеют: их id раскрывался как «autumn.1»/«winter.1»,
 * не влезал в кружок 28px и наезжал на «Ближайшая»/месяц в шапке (баг 06.09.2026).
 * Для них — иконка сезона по месяцу старта.
 */
export type ShiftBadge =
  | { kind: 'num'; text: string }
  | { kind: 'icon'; icon: string; label: string };

export function getShiftBadge(shift: Pick<Shift, 'id' | 'startDate'>): ShiftBadge {
  const num = shift.id.replace('shift-', '').replace('-', '.');
  if (/^\d+(\.\d+)?$/.test(num)) return { kind: 'num', text: num };
  const month = parseInt(shift.startDate?.split('-')[1] ?? '', 10);
  if (month === 12 || month === 1 || month === 2) return { kind: 'icon', icon: 'bi-snow', label: 'Зимняя смена' };
  if (month >= 9 && month <= 11) return { kind: 'icon', icon: 'bi-tree', label: 'Осенняя смена' };
  if (month >= 3 && month <= 5) return { kind: 'icon', icon: 'bi-flower1', label: 'Весенняя смена' };
  return { kind: 'icon', icon: 'bi-sun', label: 'Летняя смена' };
}

/** Единый текст объяснения механики листа ожидания — используется и в попапе, и в модалке брони. */
export const WAITLIST_EXPLANATION =
  'Смена распродана. Обычно к её старту 2–3 семьи отказываются от путёвки по разным причинам — освободившиеся места предлагаем по листу ожидания, в порядке очереди. Оставьте заявку — позвоним, как только появится место.';

// Завершённые смены — данные сохранены для констант (PRICE_S1/S2 и т.д.), не показываются в UI
const _shift1: Shift = {
  id: 'shift-1', name: 'Смена 1', dates: '30 мая — 8 июня', duration: '10 дней',
  status: 'завершена', statusType: 'available',
  description: 'За 10 дней — от первого шага до собственного проекта с AI и понятным результатом.',
  price: '85 900 ₽', free: 0, occupied: 35, startDate: '2026-05-30', endDate: '2026-06-08',
  recapUrl: '/kak-proshla-smena-1/', priceFrom: '74 900 ₽', priceTo: '93 900 ₽',
};
const _shift2: Shift = {
  id: 'shift-2', name: 'Смена 2', dates: '10 июня — 23 июня', duration: '14 дней',
  status: 'завершена', statusType: 'available',
  description: 'Полный цикл создания проекта: больше самостоятельности и более сложный результат.',
  price: '99 000 ₽', free: 0, occupied: 45, startDate: '2026-06-10', endDate: '2026-06-23',
  recapUrl: '/kak-proshla-smena-2/', priceFrom: '95 000 ₽', priceTo: '108 000 ₽',
};
const _shift21: Shift = {
  id: 'shift-2-1', name: 'Смена 2.1', dates: '10 июня — 16 июня', duration: '7 дней',
  status: 'завершена', statusType: 'short',
  description: 'За 7 дней — быстрый вход, свой проект и понятный результат без перегруза.',
  price: '48 000 ₽', free: 0, occupied: 40, startDate: '2026-06-10', endDate: '2026-06-16',
};
const _shift22: Shift = {
  id: 'shift-2-2', name: 'Смена 2.2', dates: '16 июня — 23 июня', duration: '8 дней',
  status: 'завершена', statusType: 'short',
  description: 'Интенсивная смена: больше времени на доработку и более сильный итоговый проект.',
  price: '75 000 ₽', free: 0, occupied: 45, startDate: '2026-06-16', endDate: '2026-06-23',
};

// === Лето 2026 — ЗАВЕРШЕНО (закрыто 07.09.2026) ===
// Смены 3 и 4 прошли 3-15 и 17-26 августа, но оставались со статусом «мало мест»
// и остатком свободных мест. Живая главная из-за этого в блоке «Подходящие смены
// для вас» предлагала родителю Смену 3 за 89 400 ₽ с подписью «уже едут
// ровесники» — три недели спустя после её конца.
//
// ⚠️ ЗАПЛАТКА, А НЕ РЕШЕНИЕ (владелец 07.09.2026, вариант А).
// Правильно было бы вынести их в архив, как Смены 1 и 2. Сделать этого сейчас
// НЕЛЬЗЯ: экспорты PRICE_S3/S4, DATES_S3/S4, DATES_SHORT_S3/S4, VYCHET_S3/S4 и
// SEASON_RANGE выводятся ПО ПОЗИЦИИ — mainShifts[0] и mainShifts[1]. Уберёшь
// смены из массива — эти экспорты молча переедут на осенние смены, и 173 страницы
// напечатают «Смена 3: 25–31 октября, 13 дней — 49 900 ₽»: имя, длительность и
// цена от разных смен в одной строке. Длительность зашита текстом в 632 местах,
// половина из них — внутри FAQ-разметки. Тест shifts.test.ts это ловит.
//
// Поэтому смены ОСТАЮТСЯ в массиве (позиции сохранены), но помечены
// завершёнными и с нулём мест — главная больше не предлагает их как доступные.
// Развязка потребителей от «Смены 3/4» — отдельная задача (вариант Б).
export const mainShifts: Shift[] = [
  {
    id: 'shift-3',
    name: 'Смена 3',
    dates: '3 августа — 15 августа',
    duration: '13 дней',
    status: 'завершена',
    statusType: 'available',
    description: 'Проект от идеи до результата с акцентом на командную работу.',
    price: '89 400 ₽',
    free: 0,
    occupied: 46,
    startDate: '2026-08-03',
    endDate: '2026-08-15',
  },
  {
    id: 'shift-4',
    name: 'Смена 4',
    dates: '17 августа — 26 августа',
    duration: '10 дней',
    status: 'завершена',
    statusType: 'available',
    description: 'Закрытие лета: сильный проект и уверенный результат.',
    price: '74 900 ₽',
    free: 0,
    occupied: 45,
    startDate: '2026-08-17',
    endDate: '2026-08-26',
  },
  // === Осень 2026 — ПРОДАЖИ ОТКРЫТЫ 27.08.2026 (решение владельца) ===
  // free: 20 — реальная ёмкость межсезонного заезда со слов владельца (27.08.2026):
  // «сорок пять мы не наберём, нужно мест двадцать». Летние смены идут по 45,
  // осенне-зимние короче и набираются слабее — не копировать летнюю вместимость.
  // До этого заезды жили отдельными константами AUTUMN_2026/AUTUMN_2026_WINDOW2 с
  // предзаписью без оплаты. Перенесены в mainShifts, как и предписывал комментарий
  // при их заведении. Константы ниже теперь ВЫЧИСЛЯЮТСЯ из этих смен — единый
  // источник правды сохранён, дублирования цен и дат нет.
  {
    id: 'shift-autumn-1',
    name: 'Осенняя смена',
    dates: '25 октября — 31 октября',
    duration: '7 дней',
    status: 'идёт запись',
    statusType: 'available',
    description: 'Осенние каникулы: программирование, нейросети и хакатон за неделю.',
    price: '49 900 ₽',
    free: 20,
    occupied: 0,
    nearest: true,
    startDate: '2026-10-25',
    endDate: '2026-10-31',
  },
  {
    id: 'shift-autumn-2',
    name: 'Осенняя смена (триместр)',
    dates: '15 ноября — 21 ноября',
    duration: '7 дней',
    status: 'идёт запись',
    statusType: 'available',
    description: 'Заезд для школ с триместровым графиком — та же программа, свои даты.',
    price: '49 900 ₽',
    free: 20,
    occupied: 0,
    startDate: '2026-11-15',
    endDate: '2026-11-21',
  },
  // === Зима 2026-2027 — ПРОДАЖИ ОТКРЫТЫ 27.08.2026 (решение владельца) ===
  // Даты зафиксированы как есть, не дожидаясь сентябрьского расписания школ:
  // зимние каникулы у всех школ практически совпадают, риск сдвига минимален.
  {
    id: 'shift-winter-1',
    name: 'Зимняя смена',
    dates: '30 декабря — 8 января',
    duration: '10 дней',
    // highlighted переехал сюда со Смены 3 (07.09.2026): та завершена вместе
    // с летом, выделять проданное незачем. Зимняя — в активной продаже
    // с 27.08, её и выделяем. Решение владельца.
    highlighted: true,
    status: 'идёт запись',
    statusType: 'available',
    description: 'Новый год со сменой: ёлка, хакатон и собственный проект за каникулы.',
    price: '74 900 ₽',
    free: 20,
    occupied: 0,
    startDate: '2026-12-30',
    endDate: '2027-01-08',
  },
];

export const shortShifts: Shift[] = [];

export const allShifts = [...mainShifts];

/** Смены, которые ещё не начались (startDate >= today). Передай today = new Date().toISOString().slice(0,10). */
export const upcomingShifts = (today: string) =>
  [...mainShifts, ...shortShifts]
    .filter(s => s.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

/**
 * Последняя УЖЕ ЗАВЕРШИВШАЯСЯ смена на дату today (endDate < today), либо null если такой нет.
 * Используется ботом (api/ask.ts) для честного ответа на "фото/итоги с последней смены" —
 * см. docs/superpowers/plans/2026-07-14-ask-bot-shift-photos-and-evals.md.
 * today = 'YYYY-MM-DD' (new Date().toISOString().slice(0,10)).
 */
export function lastCompletedShift(today: string): Shift | null {
  const completed = displayShifts.filter(s => s.endDate < today);
  if (!completed.length) return null;
  return completed.reduce((latest, s) => (s.endDate > latest.endDate ? s : latest));
}

// Все смены для показа в карусели (завершённые + активные), в хронологии.
// Фаза (предстоит/идёт/прошла) считается по датам в getShiftPhase().
export const displayShifts: Shift[] = [_shift1, _shift2, ...mainShifts];
export const shift1 = _shift1;
export const shift2 = _shift2;

// Полный список смен, включая архивные под-смены 2.1/2.2 — только для lookup по id
// (модалка ShiftModal, SHIFT_META). НЕ использовать в UI-каруселях — там displayShifts/mainShifts.
export const allShiftsIncludingArchived: Shift[] = [_shift1, _shift2, _shift21, _shift22, ...mainShifts];

/**
 * Смена по id — ЕДИНСТВЕННЫЙ способ адресовать конкретную смену в производных
 * экспортах ниже (PRICE_S3, DATES_S4, VYCHET_S3 и т.д.).
 *
 * Зачем: до 07.09.2026 эти экспорты выводились ПО ПОЗИЦИИ — mainShifts[0] и
 * mainShifts[1]. Имя говорило «Смена 3», смысл был «первая смена в массиве».
 * Пока летний сезон шёл, это совпадало; при попытке вынести завершённые летние
 * смены в архив экспорты молча переехали бы на осенние, и страницы напечатали бы
 * «Смена 3: 25–31 октября, 13 дней — 49 900 ₽» — имя, длительность и цена от трёх
 * разных смен в одной строке.
 *
 * Ищет по allShiftsIncludingArchived, а не по mainShifts, — поэтому экспорт
 * продолжает работать ПОСЛЕ выноса смены в архив. Бросает при опечатке в id:
 * молчаливого переезда на соседнюю смену больше не будет ни при каких правках.
 */
function byId(id: string): Shift {
  const s = allShiftsIncludingArchived.find((x) => x.id === id);
  if (!s) throw new Error(`shifts.ts: смены «${id}» нет в allShiftsIncludingArchived`);
  return s;
}
const _s3 = byId('shift-3');
const _s4 = byId('shift-4');

// === ЕДИНЫЙ ИСТОЧНИК метаданных смены (дата + база + длительность) ===
// Отсюда dynamicPrices.ts берёт basePrice/startDate/days и применяет правило роста.
// Включает завершённые смены — для исторических цен и фолбэков.
const _priceToNum = (p: string) => parseInt(p.replace(/[^\d]/g, ''), 10);
export interface ShiftMeta {
  basePrice: number;   // базовая цена (до роста) — из price-строки выше
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  days: number;        // длительность из duration
}
export const SHIFT_META: Record<string, ShiftMeta> = Object.fromEntries(
  allShiftsIncludingArchived.map((s) => [
    s.id,
    {
      basePrice: _priceToNum(s.price),
      startDate: s.startDate,
      endDate: s.endDate,
      days: parseInt(s.duration.replace(/[^\d]/g, ''), 10),
    },
  ]),
);

// === Derived: единые цены для типовых блоков. НЕ хардкодить цифры на страницах! ===
const _allForPrice = [...mainShifts];
const _priceNum = (p: string) => parseInt(p.replace(/[^\d]/g, ''), 10);
const _sorted = [..._allForPrice].sort((a, b) => _priceNum(a.price) - _priceNum(b.price));
const _cheapest = _sorted[0];
const _priciest = _sorted[_sorted.length - 1];
export const PRICE_MIN = _cheapest.price;
export const PRICE_MIN_ID = _cheapest.id; // id смены с ценой PRICE_MIN — для ссылок «от X ₽», ведущих на эту смену
export const PRICE_MAX = _priciest.price;
export const PRICE_RANGE = `от ${PRICE_MIN} до ${PRICE_MAX}`;
export const PRICE_S1 = _shift1.price;
export const PRICE_S2 = _shift2.price;
export const PRICE_S3 = _s3.price;
export const PRICE_S4 = _s4.price;
export const PRICE_S21 = _shift21.price;
export const PRICE_S22 = _shift22.price;

// === Длительность — ПРОИЗВОДНАЯ, как цена и даты. НЕ писать «13 дней» текстом! ===
// Длительность жила в объекте смены (duration), но на страницах была зашита
// текстом рядом с динамическими ${DATES_SHORT_S3} и ${PRICE_S3}. Меняется
// привязка — цена и дата едут, длительность остаётся, и в одной строке
// оказываются данные от разных смен. Страж: npm run check:durations.
export const DAYS_S1 = _shift1.duration;
export const DAYS_S2 = _shift2.duration;
export const DAYS_S3 = _s3.duration;
export const DAYS_S4 = _s4.duration;
export const DAYS_S21 = _shift21.duration;
export const DAYS_S22 = _shift22.duration;
// Длительности смен, задающих границы PRICE_MIN/PRICE_MAX. Без них проза
// «от ${PRICE_MIN} за 10 дней до ${PRICE_MAX} за 13 дней» врёт, как только
// границу занимает смена другой длины: 27.08.2026 осенние смены вошли в
// mainShifts, PRICE_MIN упал с 74 900 (10 дней) на 49 900 (7 дней), а зашитая
// «10 дней» осталась — и так и уехало в прод на 93 строках.
export const DAYS_MIN = _cheapest.duration;
export const DAYS_MAX = _priciest.duration;

// === Возврат при отказе от путёвки (ФЗ №2300-1 о защите прав потребителей) ===
export const BYT_PER_DAY = 6100;     // фактические расходы лагеря/день (предоплата базе отдыха) — удерживаются при возврате

// === Налоговый вычет — ПРОИЗВОДНЫЙ от цены (ст. 219 НК РФ). Меняется цена/акция → меняется вычет. ===
// НЕ хардкодить суммы вычета рядом с ценой — выводить из этих функций/констант.
export const EDU_RESID_PER_DAY = 3800; // стоимость проживания+питания по НК РФ/день — вычитается из базы вычета
export const NDFL_RATE = 0.13;         // ставка НДФЛ
export const EDU_BASE_CAP = 110000;    // годовой лимит базы вычета на 1 ребёнка (ст.219 НК РФ, с 2024)

/** Точный вычет от ЛЮБОЙ цены (учитывает акции/повышения): (цена − 3800×дни) с лимитом × 13%. */
export function taxDeduction(priceRub: number, days: number): number {
  const edu = Math.min(Math.max(priceRub - EDU_RESID_PER_DAY * days, 0), EDU_BASE_CAP);
  return Math.round(edu * NDFL_RATE);
}
const _days = (d: string) => parseInt(d.replace(/[^\d]/g, ''), 10) || 0;
/** Округлённый (до 50 ₽) вычет смены — для прозы «цена X → вычет ~Y». */
export function shiftDeduction(s: Shift): number {
  return Math.round(taxDeduction(_priceNum(s.price), _days(s.duration)) / 50) * 50;
}
/**
 * ЕДИНЫЙ формат денег на сайте: 74900 → «74 900 ₽».
 * Разряды — обычным пробелом: toLocaleString('ru-RU') ставит NBSP (U+00A0),
 * из-за чего цифры из разных источников выглядели по-разному и не находились
 * поиском по странице. Единственное место, где задаётся формат — здесь.
 */
export const fmtRub = (n: number) => n.toLocaleString('ru-RU').replace(/[\u00a0\u202f]/g, ' ') + ' ₽';
// === Трансфер от м. Солнцево — ЕДИНЫЙ ИСТОЧНИК. НЕ хардкодить цену/пункт на страницах! ===
// Инцидент: на нескольких гео-лендингах (balashiha, lubertsy, krasnogorsk, zelenograd,
// zagorodnyj-lager) часть текста утверждала «бесплатный трансфер», другая — 2000₽ —
// потому что цена была захардкожена отдельной строкой в каждом файле, и правки
// расходились. Страж: npm run check:transfer.
export const TRANSFER_PRICE = 2000; // ₽, в один конец
export const TRANSFER_POINT = 'м. Солнцево'; // точка отправления/сбора
export const TRANSFER_PRICE_FMT = fmtRub(TRANSFER_PRICE); // «2 000 ₽»
export const TRANSFER_INFO = `${TRANSFER_PRICE_FMT} в один конец, с сопровождающим`; // готовая фраза для прозы
// Туда-обратно — ПРОИЗВОДНОЕ от TRANSFER_PRICE, не отдельное число (нашли ещё один
// вариант того же дрейфа: campData.ts называл 4000₽, BookingInfoModal.astro — 5000₽).
export const TRANSFER_PRICE_ROUNDTRIP_FMT = fmtRub(TRANSFER_PRICE * 2); // «4 000 ₽»

const _fmtV = fmtRub;
// Форматированные строки вычета для прозы (как PRICE_*): «6 250 ₽».
export const VYCHET_S1 = _fmtV(shiftDeduction(_shift1));
export const VYCHET_S2 = _fmtV(shiftDeduction(_shift2));
export const VYCHET_S3 = _fmtV(shiftDeduction(_s3));
export const VYCHET_S4 = _fmtV(shiftDeduction(_s4));
export const VYCHET_S21 = _fmtV(shiftDeduction(_shift21));
export const VYCHET_S22 = _fmtV(shiftDeduction(_shift22));
// Максимальный вычет — по ВСЕМ открытым сменам, а не по двум первым в массиве.
// Было Math.max(mainShifts[0], mainShifts[1]) — та же позиционная привязка.
// Сегодняшнее значение не меняется (максимум и так у Смены 3), меняется
// поведение после выноса лета в архив.
const _maxVychetShift = mainShifts.reduce((a, b) => (shiftDeduction(b) > shiftDeduction(a) ? b : a));
export const VYCHET_MAX = _fmtV(shiftDeduction(_maxVychetShift));
// Длительность смены, дающей VYCHET_MAX. Проза «до ${VYCHET_MAX} за 13-дневную
// смену» встречается на 76 строках — без этого экспорта она врёт, как только
// максимум переезжает на смену другой длины.
export const VYCHET_MAX_DAYS = _maxVychetShift.duration;

// === Осень 2026 — окна заездов утверждены владельцем 2026-08-14 (цена — решение 2026-07-03) ===
// Два заезда: основной под четвертные каникулы, второй под триместровый график школ.
// ⚠️ Заезды ПЕРЕНЕСЕНЫ в mainShifts 27.08.2026 (продажи открыты). Константы оставлены
// как производные — их импортируют seasons.ts, lager-na-nedelyu.astro и
// lager-na-osennie-kanikuly/[window].astro; удалять их без правки этих страниц нельзя.
const _autumn1 = mainShifts.find(s => s.id === 'shift-autumn-1')!;
export const AUTUMN_2026 = {
  price: _autumn1.price,
  startDate: _autumn1.startDate,
  endDate: _autumn1.endDate,
  days: 7,
} as const;
// Второй (дополнительный) заезд — для школ с триместровой системой, утверждён 2026-08-14.
const _autumn2 = mainShifts.find(s => s.id === 'shift-autumn-2')!;
export const AUTUMN_2026_WINDOW2 = {
  price: _autumn2.price,
  startDate: _autumn2.startDate,
  endDate: _autumn2.endDate,
  days: 7,
} as const;
export const PRICE_OSEN = AUTUMN_2026.price;
export const VYCHET_OSEN = _fmtV(Math.round(taxDeduction(_priceNum(AUTUMN_2026.price), AUTUMN_2026.days) / 50) * 50);

// === Зима 2026–2027 — продажи открыты 27.08.2026, смена перенесена в mainShifts ===
// Константы оставлены производными: их импортирует seasons.ts.
const _winter1 = mainShifts.find(s => s.id === 'shift-winter-1')!;
export const WINTER_2026 = {
  price: _winter1.price,
  startDate: _winter1.startDate,
  endDate: _winter1.endDate,
  days: 10,
} as const;
export const PRICE_ZIMA = WINTER_2026.price;
export const VYCHET_ZIMA = _fmtV(Math.round(taxDeduction(_priceNum(WINTER_2026.price), WINTER_2026.days) / 50) * 50);

// === Весна 2027 — ПРЕДВАРИТЕЛЬНО (модель осенней недели, утверждение — к январю) ===
export const SPRING_2027 = {
  price: '49 900 ₽',
  startDate: '2027-03-29',
  endDate: '2027-04-04',
  days: 7,
} as const;
// === ЛЕТО 2027 — ПРЕДВАРИТЕЛЬНО (решение владельца 07.09.2026) ===
// Сетка: две смены в каждом летнем месяце, «первая» и «вторая половина»,
// по 14 дней, 50 мест. Цена 119 000 ₽ = 8 500 ₽/день × 14 (топ-ставка со
// слов владельца; себестоимость 4 500 ₽/день). Для сравнения: 14-дневная
// Смена 2 сезона 2026 стоила 99 000 ₽ (7 070 ₽/день), у Enjoy Camp 14 дней
// на лето 2027 — 150 000 ₽ полной ценой и 120 000 ₽ по раннему бронированию.
//
// ⚠️ ДАТЫ ПРЕДВАРИТЕЛЬНЫЕ. Точные будут известны 15.10.2026 — до этого дня
// числа ниже держат рамку «первая/вторая половина месяца», не более.
// Поэтому смены НЕ в mainShifts: mainShifts — то, что реально продаётся,
// и предлагать бронь на неподтверждённые даты нельзя. Страницы под лето 2027
// читают этот экспорт напрямую (как /vesna/ читает SPRING_2027).
// После 15.10: уточнить startDate/endDate, затем переносить в mainShifts.
//
// Зачем так рано: выдача по «лагеря на лето 2027» практически пуста —
// выгрузка ТОП-10 Арсенкина 07.09.2026 вернула ОДИН URL на запрос
// (deti-travel.ru). Спрос уже идёт: «лагеря на лето 2027» — 115,
// «детский лагерь 2027» — 69, «лагеря в подмосковье на лето 2027» — 43.
export const SUMMER_2027_PRELIMINARY = true;
export const SUMMER_2027_DATES_KNOWN_AT = '2026-10-15';
export const SUMMER_2027: Shift[] = [
  {
    id: 'shift-2027-06-1', name: 'Июнь, первая смена', dates: '1 июня — 14 июня', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Открытие сезона: полный цикл проекта от идеи до защиты.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-06-01', endDate: '2027-06-14',
  },
  {
    id: 'shift-2027-06-2', name: 'Июнь, вторая смена', dates: '16 июня — 29 июня', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Полный цикл проекта с акцентом на командную работу.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-06-16', endDate: '2027-06-29',
  },
  {
    id: 'shift-2027-07-1', name: 'Июль, первая смена', dates: '1 июля — 14 июля', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Середина лета: больше самостоятельности и сложнее результат.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-07-01', endDate: '2027-07-14',
  },
  {
    id: 'shift-2027-07-2', name: 'Июль, вторая смена', dates: '16 июля — 29 июля', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Проект под собственную идею — от прототипа до презентации.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-07-16', endDate: '2027-07-29',
  },
  {
    id: 'shift-2027-08-1', name: 'Август, первая смена', dates: '1 августа — 14 августа', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Сильный проект и уверенный результат к концу лета.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-08-01', endDate: '2027-08-14',
  },
  {
    id: 'shift-2027-08-2', name: 'Август, вторая смена', dates: '16 августа — 29 августа', duration: '14 дней',
    status: 'даты уточняются', statusType: 'available',
    description: 'Закрытие сезона: защита проекта и старт в новый учебный год.',
    price: '119 000 ₽', free: 50, occupied: 0,
    startDate: '2027-08-16', endDate: '2027-08-29',
  },
];
// Цена раннего бронирования (её платит родитель) и полная — от которой считается
// скидка. Решение владельца 07.09.2026 после разбора конкурентов:
//   Enjoy Camp, 14 дней:  150 000 ₽ полная / 120 000 ₽ раннее бронирование
//   Дружите.ру, 7 дней:    55 900-59 900 ₽ полная, скидка 3 000-10 000 ₽ в карточке
// Обе показывают ДВЕ цены и явную скидку. У нас механика роста цены к старту смены
// уже есть (RAMP_DAYS/DAILY_INC в dynamicPrices.ts), но подана как «дорожает» —
// покупатель видит рост, а не выгоду. Полная цена даёт точку отсчёта, от которой
// скидка вообще становится видимой.
// 139 000 ₽ = 9 929 ₽/день — ниже Enjoy Camp (10 714 ₽/день), но в их лиге.
export const PRICE_LETO_2027_FULL = '139 000 ₽';
export const PRICE_LETO_2027 = SUMMER_2027[0].price;          // раннее бронирование
export const PRICE_LETO_2027_EARLY = PRICE_LETO_2027;
// Скидка ВЫВОДИТСЯ, а не пишется руками: поменяешь любую из двух цен — сойдётся сама.
const _priceDigits = (p: string) => Number(p.replace(/[^0-9]/g, ''));
export const DISCOUNT_LETO_2027 = `${(_priceDigits(PRICE_LETO_2027_FULL) - _priceDigits(PRICE_LETO_2027)).toLocaleString('ru-RU')} \u20BD`;
export const SEATS_PER_SHIFT_2027 = 50;

export const PRICE_VESNA = SPRING_2027.price;
export const VYCHET_VESNA = _fmtV(Math.round(taxDeduction(_priceNum(SPRING_2027.price), SPRING_2027.days) / 50) * 50);

// === Даты смен — ПРОИЗВОДНЫЕ от startDate/endDate (ISO). НЕ хардкодить даты на страницах! ===
// Меняешь startDate/endDate смены → даты обновляются везде. Страж: npm run check:dates.
const _MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const _d = (iso: string) => { const [y,m,dd] = iso.split('-').map(Number); return { d: dd, m }; };
/** «10 июня — 23 июня» */
export function shiftDatesFull(s: Shift): string {
  const a=_d(s.startDate), b=_d(s.endDate);
  return `${a.d} ${_MONTHS_RU[a.m-1]} — ${b.d} ${_MONTHS_RU[b.m-1]}`;
}
/** «10–23 июня» (один месяц) либо полная форма */
export function shiftDatesShort(s: Shift): string {
  const a=_d(s.startDate), b=_d(s.endDate);
  return a.m===b.m ? `${a.d}–${b.d} ${_MONTHS_RU[a.m-1]}` : shiftDatesFull(s);
}
export const DATES_S1 = shiftDatesFull(_shift1);
export const DATES_S2 = shiftDatesFull(_shift2);
export const DATES_S3 = shiftDatesFull(_s3);
export const DATES_S4 = shiftDatesFull(_s4);
export const DATES_S21 = shiftDatesFull(_shift21);
export const DATES_S22 = shiftDatesFull(_shift22);
export const DATES_SHORT_S1 = shiftDatesShort(_shift1);
export const DATES_SHORT_S2 = shiftDatesShort(_shift2);
export const DATES_SHORT_S3 = shiftDatesShort(_s3);
export const DATES_SHORT_S4 = shiftDatesShort(_s4);
export const DATES_SHORT_S21 = shiftDatesShort(_shift21);
export const DATES_SHORT_S22 = shiftDatesShort(_shift22);

/**
 * Каноническая строка смены для прозы: «Смена 3 — 3–15 августа, 13 дней, 89 400 ₽».
 * С opts.vychet — «… (налоговый вычет ~5 200 ₽)».
 *
 * Для НОВЫХ страниц. Существующие 170+ страниц сознательно сохраняют свои
 * формулировки (их не меньше 12 видов) и собираются из атомов DAYS_, PRICE_ и
 * DATES_: переписывать видимый текст на 50 страницах с FAQ-разметкой ради
 * единообразия — SEO-риск без выгоды. Решение владельца 07.09.2026.
 */
export function shiftLine(s: Shift, opts?: { vychet?: boolean }): string {
  const base = `${s.name} — ${shiftDatesShort(s)}, ${s.duration}, ${s.price}`;
  return opts?.vychet ? `${base} (налоговый вычет ~${fmtRub(shiftDeduction(s))})` : base;
}

// Месяцы, которые реально покрывают ОТКРЫТЫЕ смены (mainShifts) — не хардкодить
// диапазон месяцев отдельно, иначе он отстаёт при закрытии ранних смен сезона
// (инцидент: "июнь–август" оставался после того, как июньские смены завершились).
// Берём МИНИМАЛЬНУЮ startDate и МАКСИМАЛЬНУЮ endDate, а не первый и последний
// элемент массива: порядок mainShifts — вопрос вёрстки карточек, а не хронологии,
// и одна переставленная смена молча сдвигала бы весь диапазон месяцев.
const _earliestStart = mainShifts.reduce((a, b) => (b.startDate < a.startDate ? b : a)).startDate;
const _latestEnd = mainShifts.reduce((a, b) => (b.endDate > a.endDate ? b : a)).endDate;
const _firstMonthIdx = _d(_earliestStart).m - 1;
const _lastMonthIdx = _d(_latestEnd).m - 1;
export const SEASON_MONTHS = _firstMonthIdx === _lastMonthIdx
  ? _MONTHS_RU[_firstMonthIdx]
  : `${_MONTHS_RU[_firstMonthIdx]}–${_MONTHS_RU[_lastMonthIdx]}`;


// Единый источник: сколько ровесников едет в каждую смену по возрасту
export const PEER_COUNTS: Record<string, Record<string, number>> = {
  'shift-1':   { '7–9': 12, '10–12': 12, '13–15': 12 },
  'shift-2':   { '7–9': 5,  '10–12': 8,  '13–15': 7 },
  'shift-2-1': { '7–9': 4,  '10–12': 7,  '13–15': 5 },
  'shift-2-2': { '7–9': 3,  '10–12': 6,  '13–15': 4 },
  'shift-3':   { '7–9': 3,  '10–12': 5,  '13–15': 4 },
  'shift-4':   { '7–9': 3,  '10–12': 4,  '13–15': 3 },
};

export function renderCard(shift: Shift) {
  const total = shift.free + shift.occupied;
  const pct = Math.round((shift.occupied / total) * 100);
  const badgeBg = shift.statusType === 'short' ? 'bg-amber-100' : 'bg-emerald-100';
  const badgeText = shift.statusType === 'short' ? 'text-amber-700' : 'text-emerald-700';
  const btnClass = shift.highlighted
    ? 'border border-primary/60 bg-primary/8 text-primary transition-colors duration-150 hover:bg-primary/14 hover:border-primary/80 active:translate-y-0'
    : 'border border-border bg-surface text-body-muted transition-colors duration-150 hover:bg-card hover:border-border-light active:translate-y-0';

  return { total, pct, badgeBg, badgeText, btnClass };
}

// --- Info modal content helpers ---

function section(title: string, text: string) {
  return `<div class="mt-4">
    <p class="text-[14px] font-semibold text-slate-900">${title}</p>
    <p class="mt-1 text-[16px] leading-[1.65] text-slate-600">${text}</p>
  </div>`;
}

function bullet(items: string[]) {
  return '<ul class="mt-1.5 space-y-1">' + items.map(i =>
    `<li class="flex items-start gap-2 text-[16px] leading-[1.5] text-slate-600">
      <span class="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>${i}
    </li>`).join('') + '</ul>';
}

function ageBlock(ages: Record<string, string>) {
  return '<div class="mt-4 space-y-2" data-age-block-container>' +
    '<p class="text-[14px] font-semibold uppercase tracking-[0.08em] text-slate-500" data-age-block-title>По возрастам</p>' +
    Object.entries(ages).map(([age, desc]) => {
      const key = age.replace(' лет', ''); // '7–9', '10–12', '13–15'
      return `<div class="rounded-[12px] border border-slate-200 bg-slate-50 p-3" data-age-group="${key}">
        <p class="text-[14px] font-semibold text-slate-400">${age}</p>
        <p class="mt-1 text-[16px] leading-[1.5] text-slate-600">${desc}</p>
      </div>`;
    }).join('') + '</div>';
}

export const shiftInfo: Record<string, {
  dates: string; duration: string; price: string; html: string;
}> = {
  'shift-1': {
    dates: '30 мая — 8 июня', duration: '10 дней', price: '85 900 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Смена выстроена как спокойный и понятный вход в программирование с гарантированным результатом на выходе.</p>' +
      section('Первые дни — включение в процесс',
        'Знакомство, деление на группы по возрасту и уровню. Сразу практика: собирается сцена, добавляется персонаж, настраивается движение и простые действия. Даже без опыта появляется первый результат уже в начале смены.') +
      section('Далее — работа над своим проектом',
        'Выбор идеи и пошаговая реализация. Например:') +
      bullet([
        'игра, где персонаж убегает от препятствий и набирает очки',
        'игра с уровнями и усложнением',
        'интерактивная история с выбором действий',
        'проект с элементами AI (реакции или генерация событий)',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Каждый день — конкретный прогресс: добавляется механика → проверяется → дорабатывается → усиливается. Проект постепенно становится «живым» и рабочим.</p>' +
      section('К середине смены', 'Уже есть работающий прототип, в который можно играть или взаимодействовать.') +
      section('Вторая половина смены — усиление',
        'Добавляются новые функции, усложняется логика, улучшается внешний вид, прорабатывается сценарий. За 2–3 дня до конца проходит хакатон: интенсивная работа, где проекты собираются в финальную версию.') +
      section('Последние дни', 'Финальная доводка и подготовка проекта: исправляются ошибки, добавляются детали, оформляется результат.') +
      ageBlock({
        '7–9 лет': 'Простые игры: движение, взаимодействие, счёт',
        '10–12 лет': 'Игры с уровнями, логикой и механикой',
        '13–15 лет': 'Проекты с элементами AI и более сложной структурой',
      }) +
      section('Как устроен AI (простыми словами)',
        'Используется как инструмент: например, чтобы игра генерировала события или персонаж реагировал «умнее», а не по заготовленному сценарию.') +
      section('Внутренняя экономика',
        'В течение всей смены работает игровая система: есть валюта — телефонное время. Её зарабатывают за активность, помощь, инициативу. И принимают решения: потратить сразу или накопить.') +
      section('Дополнительно',
        'Параллельно проходят чемпионаты лагеря (футбол, пионербол) — это часть общей игровой системы и смены активности.'),
  },
  'shift-2': {
    dates: '10 июня — 23 июня', duration: '14 дней', price: '99 000 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Смена построена с большим акцентом на самостоятельные решения и усложнение проектов.</p>' +
      section('Первые дни — быстрый вход',
        'Знакомство, деление по группам, первые задания. Уже на старте собираются базовые элементы: сцена, персонаж, движение, взаимодействие.') +
      section('Далее — развитие проекта',
        'После выбора идеи начинается работа, где постепенно добавляются механики, уровни, взаимодействие элементов, реакции и логика. Например:') +
      bullet([
        'игра с несколькими уровнями и усложнением',
        'проект с системой очков и условиями победы',
        'интерактивный сценарий с разными исходами',
        'проекты с элементами AI (генерация или реакции)',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Каждый день — развитие: сделано → протестировано → улучшено → усложнено.</p>' +
      section('К середине смены', 'Проект уже работает и имеет структуру: есть логика, цели и взаимодействие.') +
      section('Вторая половина — углубление',
        'Добавляются новые функции, усложняется поведение объектов, прорабатывается сценарий, улучшается внешний вид. За 2–3 дня до конца — хакатон: сборка финальной версии в интенсивном формате.') +
      section('Финальные дни', 'Доработка проекта и приведение его в законченный вид.') +
      ageBlock({
        '7–9 лет': 'Игры с несколькими сценариями',
        '10–12 лет': 'Проекты с уровнями, логикой и системой взаимодействия',
        '13–15 лет': 'Проекты с AI и более сложной структурой',
      }) +
      section('Как устроен AI',
        'Используется как инструмент внутри проекта: например, чтобы поведение элементов было не жёстко задано, а вариативно.') +
      section('Внутренняя экономика',
        'В течение всей смены действует система: телефонное время зарабатывается и тратится как ресурс. Это добавляет вовлечённости и учит принимать решения.') +
      section('Дополнительно',
        'Чемпионаты лагеря (футбол, пионербол) проходят в течение смены и встроены в общую динамику.'),
  },
  'shift-3': {
    dates: '3 августа — 15 августа', duration: '13 дней', price: '89 400 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Смена, в которой лагерь становится не просто площадкой для проекта, а настоящей командой.</p>' +
      section('Первые дни — старт и распределение',
        'Знакомство, деление по группам, первые задания. Сразу начинается практика: сборка базовых элементов проекта.') +
      section('Далее — работа над проектом',
        'После выбора идеи начинается реализация. Например:') +
      bullet([
        'игра с уровнями',
        'проект с несколькими сценариями',
        'интерактивная система с реакциями',
        'проект с элементами AI',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Часть задач выполняется индивидуально, часть — в команде.</p>' +
      section('Командная работа',
        'Проекты собираются совместно: распределяются роли, обсуждаются решения, объединяются части проекта. Лагерь на пару недель — как маленькая компания, где у каждого своя роль.') +
      section('На середине пути', 'Есть рабочий проект с базовой структурой.') +
      section('Вторая половина — усиление',
        'Добавляются функции, дорабатывается логика, улучшается внешний вид, собирается целостный проект. За 2–3 дня до конца — хакатон.') +
      section('Финальные дни', 'Доработка и завершение проекта.') +
      ageBlock({
        '7–9 лет': 'Игровые проекты',
        '10–12 лет': 'Проекты с логикой и взаимодействием',
        '13–15 лет': 'Проекты с AI',
      }) +
      section('Как устроен AI',
        'Используется как инструмент внутри проекта: например, для более «живого» поведения элементов.') +
      section('Внутренняя экономика',
        'Работает без остановки: ресурсы ограничены, решения имеют значение.') +
      section('Дополнительно',
        'Чемпионаты лагеря (футбол, пионербол) проходят регулярно и дополняют программу.'),
  },
  'shift-4': {
    dates: '17 августа — 26 августа', duration: '10 дней', price: '74 900 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Смена с акцентом на аккуратность, завершённость и понимание того, что сделано.</p>' +
      section('Первые дни — вход и база',
        'Знакомство, деление по группам, стартовые задания. Собираются базовые элементы проекта.') +
      section('Основная часть — разработка проекта',
        'После выбора идеи начинается поэтапная работа. Например:') +
      bullet([
        'игра с уровнями и логикой',
        'проект с системой взаимодействия',
        'интерактивная история',
        'проект с элементами AI',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Каждый день — видимый прогресс.</p>' +
      section('К середине смены', 'Проект уже работает и имеет структуру.') +
      section('Вторая половина — доведение до результата',
        'Добавляются функции, исправляются ошибки, улучшается логика, проект приводится в законченный вид. За 2–3 дня до конца — хакатон.') +
      section('Финальные дни', 'Финальная доработка и завершение проекта.') +
      ageBlock({
        '7–9 лет': 'Игровые проекты',
        '10–12 лет': 'Проекты с логикой и механикой',
        '13–15 лет': 'Проекты с AI',
      }) +
      section('Как устроен AI',
        'Используется как инструмент внутри проекта для вариативности и усложнения поведения.') +
      section('Внутренняя экономика',
        'Действует в течение всей смены: телефонное время — ресурс, который нужно заработать и грамотно использовать.') +
      section('Дополнительно',
        'Чемпионаты лагеря (футбол, пионербол) проходят в течение смены и создают смену активности.'),
  },
  'shift-2-1': {
    dates: '10 июня — 16 июня', duration: '7 дней', price: '48 000 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Короткая смена с акцентом на практику: минимум разгона, максимум действий и быстрый результат.</p>' +
      section('Первые дни — сразу в работу',
        'Знакомство, деление на группы по возрасту и уровню. С первых часов — практика: собирается сцена, добавляется персонаж, настраивается движение и базовые действия. Результат появляется практически сразу.') +
      section('Основная часть — быстрый рост проекта',
        'Выбор идеи и реализация по шагам. Например:') +
      bullet([
        'простая игра с движением и препятствиями',
        'игра с набором очков',
        'интерактивная история',
        'проект с простыми AI-элементами',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Каждый день — конкретный шаг: добавлена механика → протестирована → улучшена → добавлено новое. Проект быстро становится рабочим.</p>' +
      section('Середина смены', 'Уже есть готовая основа: можно играть или взаимодействовать.') +
      section('Финальные дни — сборка результата',
        'За 1–2 дня до конца проходит мини-хакатон: интенсивная работа, где проект доводится до финальной версии. Далее — финальная доработка: исправляются ошибки, добавляются детали, оформляется итог.') +
      ageBlock({
        '7–9 лет': 'Простые игры с движением и взаимодействием',
        '10–12 лет': 'Проекты с механикой, логикой и простыми уровнями',
        '13–15 лет': 'Быстрые проекты с элементами AI',
      }) +
      section('Как устроен AI',
        'Используется как дополнительный инструмент: например, чтобы добавить вариативные реакции или генерацию событий.') +
      section('Внутренняя экономика',
        'В течение смены действует система: телефонное время зарабатывается за активность и участие. Есть выбор: использовать сразу или копить.') +
      section('Дополнительно',
        'Чемпионаты лагеря (футбол, пионербол) проходят в течение смены и чередуются с занятиями.'),
  },
  'shift-2-2': {
    dates: '16 июня — 23 июня', duration: '8 дней', price: '75 000 ₽',
    html:
      '<p class="text-[14px] leading-[1.6] text-slate-700">Формат, в котором достаточно времени не только собрать проект, но и довести его до уверенного результата.</p>' +
      section('Первые дни — включение и база',
        'Знакомство, деление по группам, первые задания. Сразу собираются базовые элементы: сцена, персонаж, движение, взаимодействие.') +
      section('Основная часть — развитие проекта',
        'После выбора идеи начинается поэтапная работа. Например:') +
      bullet([
        'игра с уровнями и усложнением',
        'проект с системой очков и условиями',
        'интерактивный сценарий',
        'проект с элементами AI',
      ]) +
      '<p class="mt-2 text-[16px] leading-[1.65] text-slate-600">Каждый день — развитие: добавляются функции → проверяются → улучшаются → усложняются. Проект становится более структурным и интересным.</p>' +
      section('К середине смены', 'Есть рабочий проект с логикой и взаимодействием.') +
      section('Вторая половина — усиление',
        'Добавляются новые механики, усложняется поведение объектов, улучшается внешний вид, прорабатывается сценарий. За 2 дня до конца — хакатон: интенсивная сборка финальной версии.') +
      section('Финальные дни', 'Доработка проекта и приведение его в законченный вид.') +
      ageBlock({
        '7–9 лет': 'Проекты с несколькими сценариями',
        '10–12 лет': 'Игры с уровнями и логикой',
        '13–15 лет': 'Проекты с AI и более сложной структурой',
      }) +
      section('Как устроен AI',
        'Используется внутри проекта как инструмент: например, для вариативного поведения или генерации элементов.') +
      section('Внутренняя экономика',
        'Работает в течение всей смены: телефонное время зарабатывается и используется как ресурс.') +
      section('Дополнительно',
        'Чемпионаты лагеря (футбол, пионербол) встроены в программу и чередуются с занятиями.'),
  },
};
