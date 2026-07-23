/**
 * ЭВЕРГРИН — сезонные фразы, выводимые из данных смен, а НЕ захардкоженные.
 *
 * Проблема, которую решает файл: в прозе сайта были рассыпаны «июнь–август»,
 * «две смены», «июньские смены уже прошли» — они устаревают сами собой при
 * смене сезона или когда очередная смена завершилась. Здесь всё это выводится
 * из `shifts.ts` (единый источник) + даты СБОРКИ, поэтому обновляется на каждом
 * билде. Свежесть без пушей поддерживает умный cron (scripts/evergreen-cron.sh),
 * который пересобирает прод, когда смена пересекла границу.
 *
 * ПРАВИЛО: любую сезонную фразу в прозе брать отсюда, не писать литералом.
 * Страж `npm run check:evergreen` роняет билд при литеральном «июнь–август» /
 * «N смен» / «месяц прошёл» вне этого файла и shifts.ts.
 */
import {
  displayShifts,
  allShiftsIncludingArchived,
  upcomingShifts,
  SEASON_YEAR,
  type Shift,
} from './shifts';

// Дата сборки. Статический сайт: «сегодня» = момент билда (как в Shifts.astro).
const TODAY = new Date().toISOString().slice(0, 10);

const MONTH_NOM = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MONTH_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTH_PREP = ['январе','феврале','марте','апреле','мае','июне','июле','августе','сентябре','октябре','ноябре','декабре'];
const MONTH_ADJ = ['январские','февральские','мартовские','апрельские','майские','июньские','июльские','августовские','сентябрьские','октябрьские','ноябрьские','декабрьские'];

const monthIdx = (isoDate: string) => parseInt(isoDate.slice(5, 7), 10) - 1;
const day = (isoDate: string) => parseInt(isoDate.slice(8, 10), 10);

/** Женское числительное (смена — ж.р.): 1→одна, 2→две … */
function numWordF(n: number): string {
  const w = ['ноль','одна','две','три','четыре','пять','шесть','семь','восемь','девять','десять'];
  return w[n] ?? String(n);
}
/** Склонение слова «смена» по числу. */
function shiftNoun(n: number): string {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'смена';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'смены';
  return 'смен';
}
/** «две смены», «шесть смен», «одна смена». */
function shiftsPhrase(n: number): string {
  return `${numWordF(n)} ${shiftNoun(n)}`;
}
/** Уникальные месяцы набора смен, по возрастанию (индексы 0–11). */
function monthsOf(shifts: Shift[]): number[] {
  const s = new Set<number>();
  for (const sh of shifts) { s.add(monthIdx(sh.startDate)); s.add(monthIdx(sh.endDate)); }
  return [...s].sort((a, b) => a - b);
}
/** Соединить список слов: «май и август», «май, июнь и август». */
function joinRu(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return items.slice(0, -1).join(', ') + ' и ' + items[items.length - 1];
}

// ── Сезон целиком (каталог) ─────────────────────────────────────────────
const _season = allShiftsIncludingArchived;
const _sStart = _season.reduce((m, s) => (s.startDate < m ? s.startDate : m), _season[0].startDate);
const _sEnd   = _season.reduce((m, s) => (s.endDate   > m ? s.endDate   : m), _season[0].endDate);
const _sMonths = monthsOf(_season);

/** Диапазон месяцев сезона в им.п. через тире: «май–август». */
export const SEASON_MONTHS_NOM =
  `${MONTH_NOM[_sMonths[0]]}–${MONTH_NOM[_sMonths[_sMonths.length - 1]]}`;
/** «с мая по август». */
export const SEASON_FROM_TO =
  `с ${MONTH_GEN[_sMonths[0]]} по ${MONTH_NOM[_sMonths[_sMonths.length - 1]]}`;
/** Точные крайние даты сезона: «с 30 мая по 26 августа». */
export const SEASON_DATES_FULL =
  `с ${day(_sStart)} ${MONTH_GEN[monthIdx(_sStart)]} по ${day(_sEnd)} ${MONTH_GEN[monthIdx(_sEnd)]}`;
/** Всего смен в сезоне прописью: «шесть смен» (с под-сменами 2.1/2.2). */
export const SEASON_SHIFTS_TOTAL = _season.length;
export const SEASON_SHIFTS_PHRASE = shiftsPhrase(_season.length);
/** С заглавной, для начала предложения: «Шесть смен». */
export const SEASON_SHIFTS_PHRASE_CAP =
  SEASON_SHIFTS_PHRASE.charAt(0).toUpperCase() + SEASON_SHIFTS_PHRASE.slice(1);

// ── Открытые (предстоящие) смены — меняются по мере прохождения ──────────
const _open = upcomingShifts(TODAY);
const _openMonths = monthsOf(_open);

/** Число ещё не начавшихся смен. */
export const OPEN_SHIFTS_COUNT = _open.length;
/** «две смены» / «одна смена» — открыто к брони на дату сборки. */
export const OPEN_SHIFTS_PHRASE = shiftsPhrase(_open.length);
/** С заглавной, для начала предложения: «Две смены». */
export const OPEN_SHIFTS_PHRASE_CAP =
  OPEN_SHIFTS_PHRASE.charAt(0).toUpperCase() + OPEN_SHIFTS_PHRASE.slice(1);
/** Месяцы открытых смен в им.п.: «август» (или «июль и август»). */
export const OPEN_MONTHS_NOM = joinRu(_openMonths.map(i => MONTH_NOM[i]));
/** Месяцы открытых смен в предл.п.: «в августе». */
export const OPEN_MONTHS_PREP = 'в ' + joinRu(_openMonths.map(i => MONTH_PREP[i]));
/** Прилагательные месяцев открытых смен: «августовские». Для «открыты августовские смены». */
export const OPEN_MONTHS_ADJ = joinRu(_openMonths.map(i => MONTH_ADJ[i]));

// ── Прошедшие месяцы (для статусных фраз «…смены уже прошли») ────────────
const _pastMonths = monthsOf(_season).filter(m => !_openMonths.includes(m));
/** Прилагательные прошедших месяцев: «майские и июньские». Пусто, если ничего не прошло. */
export const PAST_MONTHS_ADJ = joinRu(_pastMonths.map(i => MONTH_ADJ[i]));
/** Готовая фраза статуса: «Майские и июньские смены уже прошли». '' если нечему. */
export const PAST_SHIFTS_SENTENCE = _pastMonths.length
  ? `${PAST_MONTHS_ADJ[0].toUpperCase()}${PAST_MONTHS_ADJ.slice(1)} смены уже прошли`
  : '';

export { SEASON_YEAR };
