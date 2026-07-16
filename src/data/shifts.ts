/**
 * Данные смен АйДаКемп — единый источник правды.
 * Используется в Shifts.astro (frontmatter) и в client-side script (через JSON script tag).
 */

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

export const mainShifts: Shift[] = [
  {
    id: 'shift-3',
    name: 'Смена 3',
    dates: '3 августа — 15 августа',
    duration: '13 дней',
    status: 'мало мест',
    statusType: 'available',
    description: 'Проект от идеи до результата с акцентом на командную работу.',
    price: '89 400 ₽',
    free: 5,
    occupied: 41,
    highlighted: true,
    nearest: true,
    startDate: '2026-08-03',
    endDate: '2026-08-15',
  },
  {
    id: 'shift-4',
    name: 'Смена 4',
    dates: '17 августа — 26 августа',
    duration: '10 дней',
    status: 'места есть',
    statusType: 'available',
    description: 'Закрытие лета: сильный проект и уверенный результат.',
    price: '74 900 ₽',
    free: 8,
    occupied: 37,
    startDate: '2026-08-17',
    endDate: '2026-08-26',
  },
];

export const shortShifts: Shift[] = [];

export const allShifts = [...mainShifts];

/** Смены, которые ещё не начались (startDate >= today). Передай today = new Date().toISOString().slice(0,10). */
export const upcomingShifts = (today: string) =>
  [...mainShifts, ...shortShifts]
    .filter(s => s.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

// Все смены для показа в карусели (завершённые + активные), в хронологии.
// Фаза (предстоит/идёт/прошла) считается по датам в getShiftPhase().
export const displayShifts: Shift[] = [_shift1, _shift2, ...mainShifts];
export const shift1 = _shift1;
export const shift2 = _shift2;

// Полный список смен, включая архивные под-смены 2.1/2.2 — только для lookup по id
// (модалка ShiftModal, SHIFT_META). НЕ использовать в UI-каруселях — там displayShifts/mainShifts.
export const allShiftsIncludingArchived: Shift[] = [_shift1, _shift2, _shift21, _shift22, ...mainShifts];

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
export const PRICE_MIN = _sorted[0].price;
export const PRICE_MIN_ID = _sorted[0].id; // id смены с ценой PRICE_MIN — для ссылок «от X ₽», ведущих на эту смену
export const PRICE_MAX = _sorted[_sorted.length - 1].price;
export const PRICE_RANGE = `от ${PRICE_MIN} до ${PRICE_MAX}`;
export const PRICE_S1 = _shift1.price;
export const PRICE_S2 = _shift2.price;
export const PRICE_S3 = mainShifts[0].price;
export const PRICE_S4 = mainShifts[1].price;
export const PRICE_S21 = _shift21.price;
export const PRICE_S22 = _shift22.price;

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
const _fmtV = (n: number) => n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' ₽';
// Форматированные строки вычета для прозы (как PRICE_*): «6 250 ₽».
export const VYCHET_S1 = _fmtV(shiftDeduction(_shift1));
export const VYCHET_S2 = _fmtV(shiftDeduction(_shift2));
export const VYCHET_S3 = _fmtV(shiftDeduction(mainShifts[0]));
export const VYCHET_S4 = _fmtV(shiftDeduction(mainShifts[1]));
export const VYCHET_S21 = _fmtV(shiftDeduction(_shift21));
export const VYCHET_S22 = _fmtV(shiftDeduction(_shift22));
export const VYCHET_MAX = _fmtV(Math.max(shiftDeduction(mainShifts[0]), shiftDeduction(mainShifts[1])));

// === Осень 2026 — ПРЕДВАРИТЕЛЬНО (решение владельца 2026-07-03, утверждение дат и цены — сентябрь) ===
// Сознательно НЕ в mainShifts/shortShifts: бронь закрыта, на сайте только предзапись (SeasonPreRegister).
// При открытии продаж: перенести в mainShifts обычной сменой и удалить эти константы.
export const AUTUMN_2026 = {
  price: '49 900 ₽',
  startDate: '2026-10-27',
  endDate: '2026-11-02',
  days: 7,
} as const;
export const PRICE_OSEN = AUTUMN_2026.price;
export const VYCHET_OSEN = _fmtV(Math.round(taxDeduction(_priceNum(AUTUMN_2026.price), AUTUMN_2026.days) / 50) * 50);

// === Зима 2026–2027 — ПРЕДВАРИТЕЛЬНО (цена — текущая зимняя, даты уточнятся в сентябре) ===
export const WINTER_2026 = {
  price: '74 900 ₽',
  startDate: '2026-12-30',
  endDate: '2027-01-08',
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
export const DATES_S3 = shiftDatesFull(mainShifts[0]);
export const DATES_S4 = shiftDatesFull(mainShifts[1]);
export const DATES_S21 = shiftDatesFull(_shift21);
export const DATES_S22 = shiftDatesFull(_shift22);
export const DATES_SHORT_S1 = shiftDatesShort(_shift1);
export const DATES_SHORT_S2 = shiftDatesShort(_shift2);
export const DATES_SHORT_S3 = shiftDatesShort(mainShifts[0]);
export const DATES_SHORT_S4 = shiftDatesShort(mainShifts[1]);
export const DATES_SHORT_S21 = shiftDatesShort(_shift21);
export const DATES_SHORT_S22 = shiftDatesShort(_shift22);
export const SEASON_RANGE = `${shiftDatesShort(mainShifts[0]).split('–')[0].trim()} ${_MONTHS_RU[_d(mainShifts[0].startDate).m-1]} — ${shiftDatesShort(mainShifts[1])}`; // ориентир сезона


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
      '<p class="text-[14px] leading-[1.6] text-slate-700">Смена, в которой важна не только работа над проектом, но и взаимодействие внутри команды.</p>' +
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
        'Проекты собираются совместно: распределяются роли, обсуждаются решения, объединяются части проекта. Это добавляет понимание, как создаётся общий результат.') +
      section('К середине смены', 'Есть рабочий проект с базовой структурой.') +
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
        'Работает в течение всей смены: ресурсы ограничены, решения имеют значение.') +
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
