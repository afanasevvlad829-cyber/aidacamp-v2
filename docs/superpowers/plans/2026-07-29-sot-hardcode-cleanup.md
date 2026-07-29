# Замена захардкоженных цен/дат/вычета на источник правды — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать все дубли цен, дат, длительностей и сумм налогового вычета (найдены аудитом 29.07.2026), заменив их импортами из единого источника правды, и закрыть дыры стражей, через которые дубли жили.

**Architecture:** Источник правды НЕ меняется: `src/data/shifts.ts` (SHIFT_META, PRICE_*, VYCHET_*, DATES_*, taxDeduction, fmtRub, shiftDatesFull/Short) + `src/data/dynamicPrices.ts` (getCurrentPrice, getShiftPhase, getTaxDeduction) + `src/data/evergreen.ts` (сезонные фразы). Мы только (а) добавляем 3 производных экспорта в evergreen.ts, (б) переводим потребителей на импорты, (в) расширяем стражи `check:prices`/`check:dates` и добавляем `check:vychet`, чтобы рецидив ронял билд.

**Tech Stack:** Astro 6 / TypeScript / vitest / bash+python3 стражи в `scripts/`.

## Global Constraints

- Ветка от `origin/dev`, работа в изолированном worktree: `./scripts/agent-start.sh "sot-hardcode-cleanup"`. PR — ТОЛЬКО в `dev`. Мерж в dev = автодеплой прода (память: feedback-merge-only-to-dev) — до мержа всё должно быть зелёным.
- Данные в `shifts.ts` (цены, даты, free/occupied) НЕ менять — только читать.
- Ни одного НОВОГО числового литерала цены/даты/вычета вне `shifts.ts`. Если нужна новая производная — экспорт в `shifts.ts`/`evergreen.ts`.
- `.test.ts` НЕЛЬЗЯ класть под `src/pages/` (ломает билд). Тесты данных — рядом с данными: `src/data/*.test.ts`.
- Запрещённые слова в текстах: «единиц», «баллы» (check:banned). Запрещённая цифра «5 434 ₽».
- Комментарии в коде — по-русски, в стиле репо.
- Промежуточные коммиты на ветке с красным стражем допустимы ТОЛЬКО внутри Task 8 (страж расширяется раньше фиксов его selftest-нарушений); все остальные задачи заканчиваются зелёным `npm run guard`.
- НЕ трогать (сознательные решения / ложные срабатывания аудита):
  - `src/pages/stati/nedorogoy-lager.astro:284` «6 000 ₽» — это «ремонт и амортизация» в рыночной таблице, НЕ вычет;
  - `src/data/timeline/*`, `reviewsSmena2.ts`, `kak-proshla-smena-*` — история завершённых смен;
  - `src/scripts/pages/staff-index.ts` / `staff-plan.ts` — внутренние планы прошедших смен (за cookie), в стражах — EXCL;
  - `lanit-v5/v6` — noindex-демо;
  - тесты `*.test.ts` — литералы там фиксируют ожидания.

## Порядок задач

1. Производные экспорты в evergreen.ts
2. `/ask/`-виджет (ask.ts) на импортах
3. JSON-LD: цены → getCurrentPrice (7 файлов)
4. JSON-LD: даты → SHIFT_META / SEASON_*_ISO (5 файлов)
5. Тексты вычета: бан-цифра 5 434, ложный лимит 50 000 ₽, «до 6 200 ₽»
6. hero-variants → плейсхолдеры + резолвер; landing-pages; lager-korolev
7. pamyatkaShifts из SHIFT_META + августовские группы
8. Стражи v2 (naked-числа, ISO-даты, вычет, каталоги src/scripts+src/data+scripts/)
9. Финальная проверка, PR в dev, post-deploy smoke

---

### Task 1: Производные экспорты в evergreen.ts

**Files:**
- Modify: `src/data/evergreen.ts` (после строки 82, рядом с сезонными константами)
- Test: `src/data/evergreen.test.ts` (создать, если нет; если есть — дописать describe)

**Interfaces:**
- Produces: `SEASON_START_ISO: string` ('2026-05-30'), `SEASON_END_ISO: string` ('2026-08-26'), `OPEN_DAYS_PHRASE: string` («10 и 13 дней»). Их используют Tasks 3, 4, 6.

- [ ] **Step 1: Написать падающий тест**

```ts
// src/data/evergreen.test.ts (добавить describe; файл создать при отсутствии)
import { describe, it, expect } from 'vitest';
import { SEASON_START_ISO, SEASON_END_ISO, OPEN_DAYS_PHRASE } from './evergreen';
import { allShiftsIncludingArchived } from './shifts';

describe('evergreen: производные ISO-границы и длительности', () => {
  it('SEASON_START_ISO = минимальный startDate из shifts.ts', () => {
    const min = allShiftsIncludingArchived.map(s => s.startDate).sort()[0];
    expect(SEASON_START_ISO).toBe(min);
  });
  it('SEASON_END_ISO = максимальный endDate из shifts.ts', () => {
    const max = allShiftsIncludingArchived.map(s => s.endDate).sort().at(-1);
    expect(SEASON_END_ISO).toBe(max);
  });
  it('OPEN_DAYS_PHRASE — «N и M дней» из длительностей открытых смен', () => {
    // на 29.07.2026 открыты 13 и 10 дней → «10 и 13 дней»; формат проверяем шаблоном
    expect(OPEN_DAYS_PHRASE).toMatch(/^\d+((, \d+)* и \d+)? дней$/);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run src/data/evergreen.test.ts`
Expected: FAIL — `SEASON_START_ISO` is not exported.

- [ ] **Step 3: Реализация**

В `src/data/evergreen.ts` после блока `SEASON_SHIFTS_PHRASE_CAP` (строка 82) добавить:

```ts
/** Крайние даты сезона ISO — для JSON-LD (startDate/endDate сезонных Event/Offer.priceValidUntil). */
export const SEASON_START_ISO = _sStart;
export const SEASON_END_ISO = _sEnd;
```

После блока `OPEN_MONTHS_ADJ` (строка 100) добавить:

```ts
/** Длительности открытых смен: «10 и 13 дней». '' если открытых нет. */
export const OPEN_DAYS_PHRASE = _open.length
  ? joinRu([...new Set(_open.map(s => parseInt(s.duration, 10)))].sort((a, b) => a - b).map(String)) + ' дней'
  : '';
```

- [ ] **Step 4: Тесты зелёные**

Run: `npx vitest run src/data/evergreen.test.ts` → PASS. Затем `npx vitest run` целиком → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/evergreen.ts src/data/evergreen.test.ts
git commit -m "feat(evergreen): SEASON_START/END_ISO и OPEN_DAYS_PHRASE — производные для JSON-LD и hero"
```

---

### Task 2: `/ask/`-виджет — ask.ts на импортах источника правды

**Files:**
- Modify: `src/scripts/pages/ask.ts` (строки 201–209 SMENY; 513–516 blockPrices; 544–561 blockTaxCalculator; 893–898 blockPricingBreakdown)

Контекст: ask.ts подключается из `src/pages/ask.astro:648` как `<script>import '../scripts/pages/ask'</script>` — это Vite-бандл, импорты из `../../data/*` работают; `dynamicPrices` в браузере считает цену на текущую дату (лучше билд-снапшота).

**Interfaces:**
- Consumes: `allShiftsIncludingArchived`, `mainShifts`, `SHIFT_META`, `fmtRub`, `taxDeduction`, `shiftDatesShort` из `../../data/shifts`; `getCurrentPrice`, `getShiftPhase`, `getTaxDeduction` из `../../data/dynamicPrices`.

- [ ] **Step 1: Добавить импорты в начало файла (после существующих импортов, если есть)**

```ts
import { allShiftsIncludingArchived, mainShifts, SHIFT_META, fmtRub, taxDeduction, shiftDatesShort } from '../../data/shifts';
import { getCurrentPrice, getShiftPhase, getTaxDeduction } from '../../data/dynamicPrices';

/** Текущая цена смены строкой «74 900 ₽» (правило роста; фолбэк — база). */
const shiftPriceStr = (id: string) => fmtRub(getCurrentPrice(id) ?? SHIFT_META[id].basePrice);
```

- [ ] **Step 2: Заменить SMENY (строки 202–209)**

```ts
/* ── CAMP DATA — всё из src/data/shifts.ts, здесь ничего не хардкодим ── */
const SMENY = allShiftsIncludingArchived.map(s => ({
  n: s.name,
  dates: shiftDatesShort(s),
  days: s.duration,
  price: shiftPriceStr(s.id),
  available: getShiftPhase(s.id) === 'upcoming' && s.free > 0,
  popular: !!s.popular,
  short: s.statusType === 'short',
  occupied: s.occupied,
  total: s.occupied + s.free,
}));
```

(Заполняемость перестаёт расходиться с shifts.ts — это осознанное изменение цифр в виджете.)

- [ ] **Step 3: Заменить массив tabs в blockPrices() (строки 513–516)**

```ts
  // Табы «Стоимость смен» — по открытым сменам, отсортированы по длительности
  const tabs = [...mainShifts]
    .sort((a, b) => SHIFT_META[a.id].days - SHIFT_META[b.id].days)
    .map(s => ({
      label: s.duration,
      price: shiftPriceStr(s.id),
      sub: `за смену · ${s.name}`,
      inc: [
        `Полная программа — ${s.duration}`,
        'Всё включено (проживание, питание, IT, трансфер) + хакатон',
        'Сертификат и документы для вычета по итогам',
      ],
      cb: `Налоговый вычет 13% — вернёте от <strong>${fmtRub(Math.floor(getTaxDeduction(s.id) / 100) * 100)}</strong> через ФНС`,
    }));
```

- [ ] **Step 4: Заменить SHIFTS/константы/calc в blockTaxCalculator() (строки 545–561)**

```ts
  // Смены для калькулятора: [название, текущая цена, дней] — из shifts.ts; открытые сверху
  const SHIFTS = [...allShiftsIncludingArchived]
    .sort((a, b) => Number(getShiftPhase(a.id) === 'done') - Number(getShiftPhase(b.id) === 'done'))
    .map(s => [
      `${s.name}${getShiftPhase(s.id) === 'done' ? ' (завершена)' : ''} — ${shiftDatesShort(s)}, ${s.duration}`,
      getCurrentPrice(s.id) ?? SHIFT_META[s.id].basePrice,
      SHIFT_META[s.id].days,
    ] as [string, number, number]);
  function calc(price: number, days: number) {
    // Единая формула — taxDeduction() из shifts.ts; для виджета округляем до 100 ₽
    return Math.round(taxDeduction(price, days) / 100) * 100;
  }
```

Удалить локальные `RESIDENTIAL_PER_DAY` и `EDU_LIMIT`.

- [ ] **Step 5: blockPricingBreakdown() (строки 893–898)**

Демо-цену `'99 000 ₽'` заменить на `shiftPriceStr(mainShifts[0].id)`; подпись `'августовские смены · всё включено'` → `'актуальная цена смены · всё включено'`; в steps `amount:'-5 200 ₽'` → `` amount: `-${fmtRub(Math.floor(getTaxDeduction(mainShifts[0].id) / 100) * 100)}` ``.

- [ ] **Step 6: Убедиться, что литералов не осталось**

Run: `grep -nE "(48|74|75|85|89|99) ?[0-9]{3}|3800|110000|5 ?200 ?₽|4 ?800 ?₽" src/scripts/pages/ask.ts`
Expected: 0 строк (координаты 55.26/36.72 и rgba-цвета под паттерн не попадают).

- [ ] **Step 7: Проверить типы и сборку страницы**

Run: `npx astro check --minimumSeverity error 2>&1 | grep -i "ask" ` → пусто; `npx vitest run` → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scripts/pages/ask.ts
git commit -m "fix(ask): смены/цены/вычет из shifts.ts+dynamicPrices вместо полного дубля"
```

---

### Task 3: JSON-LD цены → getCurrentPrice

**Files:**
- Modify: `src/components/CourseSchema.astro:58-59,75`
- Modify: `src/pages/lager-zelenograd.astro:116,123-152`
- Modify: `src/pages/detskiy-lager-podmoskove.astro:157-163`
- Modify: `src/pages/stati/lager-naro-fominsk.astro:116-123`
- Modify: `src/pages/api/fortune/init.ts:95`
- Modify: `src/components/corp/CorpTax.astro:6-10`, `src/components/corp/CorpPricing.astro:9-10`

**Interfaces:**
- Consumes: `getCurrentPrice`, `getShiftPhase` (dynamicPrices); `PRICE_MIN_ID`, `SHIFT_META`, `displayShifts`, `shiftDatesShort`, `taxDeduction` (shifts); `SEASON_START_ISO`, `SEASON_END_ISO` (evergreen, Task 1).
- Общий хелпер-паттерн (повторять локально в frontmatter, он однострочный):
  `const ldPrice = (id: string) => String(getCurrentPrice(id) ?? SHIFT_META[id].basePrice);`

- [ ] **Step 1: CourseSchema.astro**

В frontmatter добавить импорты:

```ts
import { getCurrentPrice } from '../data/dynamicPrices';
import { PRICE_MIN_ID, SHIFT_META } from '../data/shifts';
import { SEASON_START_ISO, SEASON_END_ISO } from '../data/evergreen';
```

Заменить: `startDate: '2026-06-01'` → `startDate: SEASON_START_ISO`; `endDate: '2026-08-31'` → `endDate: SEASON_END_ISO`; `price: '74900'` → `price: String(getCurrentPrice(PRICE_MIN_ID) ?? SHIFT_META[PRICE_MIN_ID].basePrice)`.

- [ ] **Step 2: lager-zelenograd.astro — offers циклом**

Добавить в импорты страницы `displayShifts`, `SHIFT_META`, `shiftDatesShort` (из `../data/shifts`) и `getCurrentPrice`, `getShiftPhase` (из `../data/dynamicPrices`); `DATES_SHORT_*` из импортов можно убрать, если больше не используются. Заменить массив `"offers"` (строки 123–152):

```ts
  "offers": displayShifts.map(s => ({
    "@type": "Offer",
    "name": `${s.name} (${shiftDatesShort(s)}, ${s.duration})${getShiftPhase(s.id) === 'done' ? ' — завершена' : ''}`,
    "price": String(getCurrentPrice(s.id) ?? SHIFT_META[s.id].basePrice),
    "priceCurrency": "RUB",
    "availability": getShiftPhase(s.id) === 'done' ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
  })),
```

(Смена 2.1 из списка уходит, добавляется Смена 1 — displayShifts канонический набор карусели; это ок.)
Там же строка 116: `«для детей 7-17 лет»` → `«для детей 7–15 лет»`.

- [ ] **Step 3: detskiy-lager-podmoskove.astro — оффер завершённой смены**

Строки 157–163: `"price": "48000"` → `"price": String(getCurrentPrice(PRICE_MIN_ID) ?? SHIFT_META[PRICE_MIN_ID].basePrice)` (импортировать `PRICE_MIN_ID`, `SHIFT_META`, `getCurrentPrice`). Даты этой страницы — в Task 4.

- [ ] **Step 4: stati/lager-naro-fominsk.astro**

Строка 119: `"price": "48000"` → аналогично Step 3 (импорты добавить). `validFrom: "2026-04-01"` оставить (исторический факт открытия продаж).

- [ ] **Step 5: fortune/init.ts**

Строка 95: `?? 93900` → `?? SHIFT_META['shift-1'].basePrice` (импортировать `SHIFT_META` из `../../../data/shifts` — путь сверить по соседним импортам файла).

- [ ] **Step 6: corp-компоненты**

`CorpTax.astro` (строки 6–10):

```ts
import { SHIFT_META, taxDeduction } from '../../data/shifts';

const basePrice       = SHIFT_META['shift-3'].basePrice;
const days            = SHIFT_META['shift-3'].days;
const discountedPrice = Math.round(basePrice * (1 - client.discount / 100));
const taxReturn       = taxDeduction(discountedPrice, days); // единая формула вместо локальной
```

`CorpPricing.astro` (строки 9–10): `days: 13, basePrice: 89400` → `days: SHIFT_META['shift-3'].days, basePrice: SHIFT_META['shift-3'].basePrice`; для Смены 4 — `SHIFT_META['shift-4']`. В desc «13 дней…»/«10 дней…» → шаблоном `` `${SHIFT_META['shift-3'].days} дней…` `` (соответственно shift-4). Импорт `SHIFT_META` добавить.

- [ ] **Step 7: Проверка**

Run: `grep -rnE '"price":\s*"?[0-9]{5,6}"?|price:\s*.[0-9]{5,6}|basePrice\s*[:=]\s*[0-9]{5,6}' src/pages src/components --include='*.astro' | grep -v lanit`
Expected: 0 строк (кроме, возможно, `lager-na-leto-2026.astro` — он в Task 4).
Run: `npx astro check --minimumSeverity error` → без новых ошибок; `npm run check:prices` → зелёный.

- [ ] **Step 8: Commit**

```bash
git add src/components/CourseSchema.astro src/pages/lager-zelenograd.astro src/pages/detskiy-lager-podmoskove.astro src/pages/stati/lager-naro-fominsk.astro src/pages/api/fortune/init.ts src/components/corp/CorpTax.astro src/components/corp/CorpPricing.astro
git commit -m "fix(seo): цены в JSON-LD из getCurrentPrice — убран InStock-оффер завершённой смены за 48 000"
```

---

### Task 4: JSON-LD даты → SHIFT_META / SEASON_*_ISO

**Files:**
- Modify: `src/pages/ceny.astro:18-25, 226-310`
- Modify: `src/pages/lager-na-leto-2026.astro:108-168`
- Modify: `src/pages/detskiy-lager-podmoskove.astro:105-106,131,141-142` (+ строка 108)
- Modify: `src/pages/detskiy-lager.astro:175-176,195`
- Modify: `src/data/landings/lager-domodedovo.ts:114-117` (+ возраст стр. 114)

**Interfaces:**
- Consumes: `allShiftsIncludingArchived`, `displayShifts`, `SHIFT_META`, `SEASON_YEAR`, `PRICE_MIN_ID` (shifts); `getCurrentPrice`, `getShiftPhase` (dynamicPrices); `SEASON_START_ISO`, `SEASON_END_ISO`, `SEASON_DATES_FULL`, `SEASON_MONTHS_NOM`, `OPEN_SHIFTS_PHRASE_CAP`, `OPEN_MONTHS_PREP`, `OPEN_DAYS_PHRASE` (evergreen).

- [ ] **Step 1: ceny.astro — фолбэки schemaPrice (строки 18–25)**

```ts
const ldPrice = (id: string) => String(getCurrentPrice(id) ?? SHIFT_META[id].basePrice);
const schemaPrice = {
  s1: ldPrice('shift-1'), s2: ldPrice('shift-2'), s21: ldPrice('shift-2-1'),
  s22: ldPrice('shift-2-2'), s3: ldPrice('shift-3'), s4: ldPrice('shift-4'),
};
```

(Импортировать `SHIFT_META` — добавить в существующий импорт из `../data/shifts`.)
Также строка 222: `"priceValidUntil": "2026-08-31"` → `"priceValidUntil": SEASON_END_ISO` (импорт из `../data/evergreen`).

- [ ] **Step 2: ceny.astro — 6 Event-блоков одним циклом (строки 226–310)**

Во frontmatter:

```ts
import { getShiftPhase } from '../data/dynamicPrices'; // рядом с getCurrentPrice
import { allShiftsIncludingArchived } from '../data/shifts'; // добавить в существующий импорт

// Event-блоки JSON-LD всех смен сезона — генерируются из shifts.ts
const eventLd = allShiftsIncludingArchived.map(s => ({
  "@context": "https://schema.org",
  "@type": "Event",
  "name": `${s.name} — IT-лагерь АйДаКемп ${SEASON_YEAR} (${s.duration})`,
  "startDate": s.startDate,
  "endDate": s.endDate,
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": { "@type": "Place", "name": "Санаторий Изумруд, Подмосковье", "address": { "@type": "PostalAddress", "addressCountry": "RU", "addressRegion": "Московская область" } },
  "organizer": { "@type": "Organization", "name": "АйДаКемп", "url": "https://aidacamp.ru" },
  "description": `${s.description} IT-лагерь для детей 7–15 лет, ${s.duration}.`,
  "offers": { "@type": "Offer", "price": ldPrice(s.id), "priceCurrency": "RUB", "url": "https://aidacamp.ru/ceny", "availability": getShiftPhase(s.id) === 'done' ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
  "audience": { "@type": "PeopleAudience", "suggestedMinAge": 7, "suggestedMaxAge": 15 },
}));
```

В шаблоне блок строк 226–310 заменить на:

```astro
    <script type="application/ld+json" set:html={JSON.stringify(eventLd)} />
```

- [ ] **Step 3: lager-na-leto-2026.astro — event-массив циклом**

Во frontmatter добавить импорты (`displayShifts`, `SHIFT_META`, `PRICE_MIN_ID`, `SEASON_YEAR`; `getCurrentPrice`, `getShiftPhase`; `SEASON_END_ISO`) и:

```ts
const ldPrice = (id: string) => String(getCurrentPrice(id) ?? SHIFT_META[id].basePrice);
const eventList = displayShifts.map(s => ({
  "@type": "EducationEvent",
  "name": `Летний IT-лагерь ${SEASON_YEAR} - ${s.name}`,
  "startDate": s.startDate,
  "endDate": s.endDate,
  "eventAttendanceMode": "OfflineEventAttendanceMode",
  "offers": { "@type": "Offer", "price": ldPrice(s.id), "priceCurrency": "RUB",
    "availability": getShiftPhase(s.id) === 'done' ? "https://schema.org/SoldOut" : "https://schema.org/InStock" },
}));
```

В JSON-LD (строки 108–167): `"price": "74900"` → `"price": ldPrice(PRICE_MIN_ID)`; `"priceValidUntil": "2026-08-26"` → `"priceValidUntil": SEASON_END_ISO`; массив `"event": [ …4 блока… ]` → `"event": eventList`.

- [ ] **Step 4: detskiy-lager-podmoskove.astro — сезонные даты и проза**

- Строки 141–142: `"startDate": "2026-05-30"` → `SEASON_START_ISO`, `"endDate": "2026-08-26"` → `SEASON_END_ISO` (импорт из `../data/evergreen` — там уже берутся `SEASON_SHIFTS_PHRASE` и др., дописать в тот же импорт вместе с `SEASON_DATES_FULL`, `OPEN_SHIFTS_PHRASE_CAP`, `OPEN_MONTHS_PREP`, `OPEN_DAYS_PHRASE`).
- Строка 106, текст: `` `АйДаКемп работает с 30 мая по 26 августа. Большой выбор: ${SEASON_SHIFTS_PHRASE} продолжительностью 7–14 дней — выбирайте даты под каникулы. Принимаем детей и подростков 7–15 лет без опыта программирования. Июль традиционно заканчивается первым — бронируйте заранее.` `` →

```ts
    text: `АйДаКемп работает ${SEASON_DATES_FULL}. За сезон — ${SEASON_SHIFTS_PHRASE}; сейчас открыты смены ${OPEN_DAYS_PHRASE} — выбирайте даты под каникулы. Принимаем детей и подростков 7–15 лет без опыта программирования. Места разбирают заранее — бронируйте, пока смена не закрылась.`,
```

  («Июль заканчивается первым» — ложный факт: июльских смен в сезоне нет.)
- Строка 108: `` `Смены летом: июнь, июль, август — выбирайте удобные даты` `` → `` `Смены летом: ${SEASON_MONTHS_NOM} — выбирайте удобные даты` ``.
- Строка 131 (FAQ-ответ): → `` a: `АйДаКемп работает ${SEASON_DATES_FULL} ${SEASON_YEAR}. ${OPEN_SHIFTS_PHRASE_CAP} ещё открыты к брони — ${OPEN_MONTHS_PREP}. Подробное расписание — на странице цен.` ``
- Строка 168 (subtitle LandingHero): `«Смены лето ${SEASON_YEAR}, с 30 мая по 26 августа.»` → `` `Смены лето ${SEASON_YEAR}, ${SEASON_DATES_FULL}.` ``

- [ ] **Step 5: detskiy-lager.astro**

Строки 175–176: ISO-литералы → `SEASON_START_ISO` / `SEASON_END_ISO`; строка 195 `"priceValidUntil": "2026-08-26"` → `SEASON_END_ISO`. Импорт из `../data/evergreen` дописать.

- [ ] **Step 6: landings/lager-domodedovo.ts**

```ts
import { SEASON_START_ISO, SEASON_END_ISO } from '../evergreen';
```

`startDate: '2026-06-10'` → `startDate: SEASON_START_ISO`; `endDate: '2026-08-26'` → `endDate: SEASON_END_ISO`; в description `«для детей 8-17 лет»` → `«для детей 7–15 лет»`.

- [ ] **Step 7: Проверка**

Run: `grep -rn "'2026-0[5-8]-[0-9][0-9]'\|\"2026-0[5-8]-[0-9][0-9]\"" src/pages src/components src/data/landings --include='*.astro' --include='*.ts' | grep -vE "lanit|timeline|reviews|kak-proshla|test"`
Expected: 0 строк.
Run: `npx astro check --minimumSeverity error` → чисто; `npm run check:dates` → зелёный; `npx vitest run` → PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ceny.astro src/pages/lager-na-leto-2026.astro src/pages/detskiy-lager-podmoskove.astro src/pages/detskiy-lager.astro src/data/landings/lager-domodedovo.ts
git commit -m "fix(seo): даты JSON-LD из SHIFT_META/SEASON_ISO, Event-блоки генерируются циклом"
```

---

### Task 5: Тексты вычета и устаревшие цены в прозе

**Files:**
- Modify: `scripts/seo-factory/rewrite-blocks.js:20-35` (два блока)
- Modify: `src/pages/lager-obnisk.astro:224-226, 231`
- Modify: `src/pages/stati/ekonomika-detskogo-lagerya.astro:17`, `src/pages/stati/detskie-lagerya-v-mire.astro:18`

- [ ] **Step 1: seo-factory — убрать запрещённую цифру и мёртвые цены**

В `rewrite-blocks.js` в блоке `detskiy-letniy-lager-v-podmoskove` item `'Налоговый вычет 13% — до 5 434 ₽ за 14-дневную смену'` → `'Налоговый вычет 13% с образовательной части — документы выдаём автоматически'`.
В блоке `detskie-lagerya-v-podmoskove-tseny-2026`:
- в прозе `'…стоимость — от 48 000 до 99 000 ₽ в зависимости от длины. Часть денег возвращается: налоговый вычет 13% даёт до 5 434 ₽ за самую длинную, 14-дневную смену.'` → `'…актуальные цены и длительности смен — на aidacamp.ru/ceny. Часть денег возвращается: налоговый вычет 13% с образовательной части путёвки.'`
- items `'Смена 7 дней — от 48 000 ₽','Смена 14 дней — до 99 000 ₽'` → `'Актуальные цены смен — на aidacamp.ru/ceny','Оплата частями: 50% при брони, 50% за 3 недели до старта'`
- item `'Налоговый вычет 13% — до 5 434 ₽ за 14-дневную смену'` → как в первом блоке.

- [ ] **Step 2: Проверить, что 5 434 не осталось нигде (в т.ч. на сгенерированных страницах)**

Run: `grep -rn "5 434\|5434" src/ scripts/ --exclude-dir=node_modules | grep -v eval-graders`
Expected: 0 строк. Если найдётся на страницах в `src/pages` — заменить формулировкой из Step 1 там же.

- [ ] **Step 3: lager-obnisk.astro — цены открытых смен, лимит 110 000, мусорный ```**

В импорт из `../data/shifts` (строка 2) добавить `fmtRub, EDU_BASE_CAP`. Заменить строки 224–226:

```astro
    <p>Цены на путёвки открытых смен — от {PRICE_MIN} до {PRICE_MAX}. Для родителей из Обнинска важно знать: лагерь имеет <strong>лицензию Минобрнауки</strong>, что позволяет вернуть 13% стоимости образовательной части путёвки через налоговый вычет.</p>

    <p>Лимит вычета на образование ребёнка — {fmtRub(EDU_BASE_CAP)} в год (ст. 219 НК РФ). За одну смену в АйДаКемп возврат составляет до {VYCHET_MAX} — прямая экономия для семьи.</p>
```

Удалить строку 231 — случайный markdown-фенс `` ``` `` прямо в разметке (проверить в браузере/HTML, что он реально рендерился, и что после удаления секция закрывается корректно).

- [ ] **Step 4: «до 6 200 ₽» в двух статьях**

В обоих файлах добавить `VYCHET_S1` в импорт из `../../data/shifts` и заменить `"Как вернуть до 6 200 ₽"` → `` `Как вернуть до ${VYCHET_S1}` `` (VYCHET_S1 — максимум сезона, сейчас «6 250 ₽»; строка остаётся истинной при любой правке цен).

- [ ] **Step 5: Проверка + Commit**

Run: `npm run check:banned && npm run check:prices && npx astro check --minimumSeverity error` → зелёные.

```bash
git add scripts/seo-factory/rewrite-blocks.js src/pages/lager-obnisk.astro src/pages/stati/ekonomika-detskogo-lagerya.astro src/pages/stati/detskie-lagerya-v-mire.astro
git commit -m "fix(content): убрана запрещённая «5 434 ₽», лимит вычета 110 000, цены открытых смен в obnisk"
```

---

### Task 6: hero-variants → плейсхолдеры; landing-pages; lager-korolev

**Files:**
- Create: `src/data/heroVariants.ts`
- Test: `src/data/heroVariants.test.ts`
- Modify: `src/data/hero-variants.json` (строки 6-9, 25-35, 85-100, 110-125, 138-152)
- Modify: `src/components/Hero.astro`, `src/pages/api/hero-variants.json.ts` (перевести на резолвер)
- Modify: `src/data/landing-pages.ts:124,130`
- Modify: `src/data/landings/lager-korolev.ts:125`

**Interfaces:**
- Produces: `HERO_VARIANTS: Record<string, {title: string; subtitle?: string}>` — уже с подставленными значениями. Потребители: Hero.astro и api-роут.
- Плейсхолдеры в JSON: `{PRICE_MIN}`, `{OPEN_DAYS}`, `{OPEN_MONTHS_NOM}`, `{OPEN_MONTHS_PREP}`, `{SEASON_FROM_TO}`.

- [ ] **Step 1: Падающий тест**

```ts
// src/data/heroVariants.test.ts
import { describe, it, expect } from 'vitest';
import { HERO_VARIANTS } from './heroVariants';
import raw from './hero-variants.json';

describe('heroVariants: источник правды вместо хардкода', () => {
  const rawStrings = Object.values(raw as Record<string, { title: string; subtitle?: string }>)
    .flatMap(v => [v.title, v.subtitle ?? '']);
  const resolved = Object.values(HERO_VARIANTS).flatMap(v => [v.title, v.subtitle ?? '']);

  it('в JSON нет литеральных цен и «июнь–август»', () => {
    for (const s of rawStrings) {
      expect(s).not.toMatch(/\d{2}\s?\d{3}\s?₽/);
      expect(s).not.toMatch(/июнь–август/);
    }
  });
  it('в резолвнутых вариантах не осталось {ТОКЕНОВ}', () => {
    for (const s of resolved) expect(s).not.toMatch(/\{[A-Z_]+\}/);
  });
});
```

Run: `npx vitest run src/data/heroVariants.test.ts` → FAIL (модуля нет + в JSON есть цены).

- [ ] **Step 2: Резолвер**

```ts
// src/data/heroVariants.ts
/**
 * Резолвер hero-вариантов: подставляет живые значения источника правды
 * в тексты hero-variants.json. В JSON цифры и сезоны руками не писать —
 * только плейсхолдеры {PRICE_MIN}, {OPEN_DAYS}, {OPEN_MONTHS_NOM},
 * {OPEN_MONTHS_PREP}, {SEASON_FROM_TO}.
 */
import raw from './hero-variants.json';
import { PRICE_MIN } from './shifts';
import { OPEN_DAYS_PHRASE, OPEN_MONTHS_NOM, OPEN_MONTHS_PREP, SEASON_FROM_TO } from './evergreen';

const TOKENS: Record<string, string> = {
  '{PRICE_MIN}': PRICE_MIN,
  '{OPEN_DAYS}': OPEN_DAYS_PHRASE,
  '{OPEN_MONTHS_NOM}': OPEN_MONTHS_NOM,
  '{OPEN_MONTHS_PREP}': OPEN_MONTHS_PREP,
  '{SEASON_FROM_TO}': SEASON_FROM_TO,
};
const subst = (s: string) => Object.entries(TOKENS).reduce((acc, [t, v]) => acc.split(t).join(v), s);

export type HeroVariant = { title: string; subtitle?: string };
export const HERO_VARIANTS: Record<string, HeroVariant> = Object.fromEntries(
  Object.entries(raw as Record<string, HeroVariant>).map(([k, v]) => [
    k,
    { ...v, title: subst(v.title), ...(v.subtitle !== undefined ? { subtitle: subst(v.subtitle) } : {}) },
  ]),
);
```

- [ ] **Step 3: Правки hero-variants.json (точечные замены)**

| Ключ | Было | Стало |
|---|---|---|
| camp2026.subtitle | «…7 и 14 дней, июнь–август. 66 км от МКАД.» | «…{OPEN_DAYS}, {OPEN_MONTHS_NOM}. 66 км от МКАД.» |
| price.title | «IT-лагерь 7–15 лет от 74 900₽» | «IT-лагерь 7–15 лет от {PRICE_MIN}» |
| price.subtitle | «10 дней: программирование…» | «{OPEN_DAYS}: программирование…» |
| next_step.subtitle | «Свой проект за 7 дней, бассейн, друзья…» | «Свой проект за смену, бассейн, друзья…» |
| polza.subtitle | «…свой проект за 7 дней, бассейн, команда…» | «…свой проект за смену, бассейн, команда…» |
| proekt.title | «За 7 дней — свой проект» | «За смену — свой проект» |
| bounce_01.subtitle, bounce_02.subtitle | «Смены от 74 900₽, 10 и 13 дней, июнь–август.…» | «Смены от {PRICE_MIN}, {OPEN_DAYS}, {OPEN_MONTHS_NOM}.…» |
| podmoskove2026.subtitle | «…Смены от 7 дней, с июня по август» | «…Смены {OPEN_DAYS}, {OPEN_MONTHS_PREP}» |
| letny_podmoskove.subtitle | «…66 км от МКАД, с июня по август» | «…66 км от МКАД, {OPEN_MONTHS_PREP}» |
| lager_moskva.subtitle | «…Смены от 7 дней, с июня» | «…Смены {OPEN_DAYS}, {OPEN_MONTHS_PREP}» |

- [ ] **Step 4: Перевести потребителей на резолвер**

В `src/components/Hero.astro` и `src/pages/api/hero-variants.json.ts` найти импорт `hero-variants.json` и заменить на `import { HERO_VARIANTS } from '../data/heroVariants'` (в api-роуте путь `../../data/heroVariants`), дальше по коду использовать `HERO_VARIANTS` вместо сырого JSON (форма объекта та же — `Record<key, {title, subtitle}>`). Прямых импортов `hero-variants.json` в src/ остаться не должно, кроме самого резолвера и теста:
Run: `grep -rn "hero-variants.json" src/ | grep -v "heroVariants"` → 0 строк.

- [ ] **Step 5: landing-pages.ts и lager-korolev.ts**

`landing-pages.ts`: в импорт добавить `PRICE_MIN`, `SEASON_YEAR` (из `./shifts`); строка 124 `'От 74 900 ₽ за смену, оплата частями'` → `` `От ${PRICE_MIN} за смену, оплата частями` ``; строка 130 `'Смены июня 2026, с 30 мая'` → `` `Июньские смены ${SEASON_YEAR}` ``.
`lager-korolev.ts`: `import { OPEN_DAYS_PHRASE } from '../evergreen';`; «АйДаКемп — 7 или 14 дней полного погружения…» → `` `АйДаКемп — ${OPEN_DAYS_PHRASE} полного погружения…` ``.

- [ ] **Step 6: Тесты и визуальная проверка**

Run: `npx vitest run` → PASS; `npx astro check --minimumSeverity error` → чисто.
Затем `npm run dev` (или preview) → открыть `/` с параметром варианта (см. логику Hero.astro) и убедиться, что заголовок рендерится с реальной ценой, без `{PRICE_MIN}`.

- [ ] **Step 7: Commit**

```bash
git add src/data/heroVariants.ts src/data/heroVariants.test.ts src/data/hero-variants.json src/components/Hero.astro src/pages/api/hero-variants.json.ts src/data/landing-pages.ts src/data/landings/lager-korolev.ts
git commit -m "feat(hero): плейсхолдеры вместо хардкода цен/сезона, резолвер heroVariants из источника правды"
```

---

### Task 7: pamyatkaShifts из SHIFT_META + августовские группы

**Files:**
- Modify: `src/data/pamyatkaShifts.ts` (полностью секция PAMYATKA_SHIFTS)
- Test: `src/data/pamyatkaShifts.test.ts`

⚠️ Блокер данных: `group_id` августовских групп (Смены 3/4) в Альфа-CRM. Получить ЛЮБЫМ из способов: (а) MCP `run(service="alfacrm", …)` — список групп; (б) спросить владельца. Если к моменту исполнения ID недоступны — выкатить только derivation (Step 3) с закомментированными строками и явным TODO в PR-описании.

- [ ] **Step 1: Выяснить group_id августовских групп**

Через MCP aidacamp-tools: `run(service="alfacrm", action=…)` (перечень групп; в UI CRM — Группы → URL `?id=XXX`). Ожидаемо ID следующие за 663 (664/665) — ПОДТВЕРДИТЬ, не угадывать.

- [ ] **Step 2: Падающий тест**

```ts
// src/data/pamyatkaShifts.test.ts
import { describe, it, expect } from 'vitest';
import { PAMYATKA_SHIFTS } from './pamyatkaShifts';
import { allShiftsIncludingArchived, shiftDatesFull, SEASON_YEAR } from './shifts';

const byId = Object.fromEntries(allShiftsIncludingArchived.map(s => [s.id, s]));

describe('pamyatkaShifts: даты выводятся из shifts.ts', () => {
  it('группа 660 (1 смена CRM) = сайтовая Смена 1', () => {
    expect(PAMYATKA_SHIFTS[660].dates).toBe(`${shiftDatesFull(byId['shift-1'])} ${SEASON_YEAR}`);
  });
  it('группа 663 (4 смена CRM) = сайтовая Смена 2 (14 дней)', () => {
    expect(PAMYATKA_SHIFTS[663].dates).toBe(`${shiftDatesFull(byId['shift-2'])} ${SEASON_YEAR}`);
  });
  it('августовские смены присутствуют (пропустить, если ID из CRM ещё не подтверждены)', () => {
    const dates = Object.values(PAMYATKA_SHIFTS).map(p => p.dates);
    expect(dates).toContain(`${shiftDatesFull(byId['shift-3'])} ${SEASON_YEAR}`);
    expect(dates).toContain(`${shiftDatesFull(byId['shift-4'])} ${SEASON_YEAR}`);
  });
});
```

Run: `npx vitest run src/data/pamyatkaShifts.test.ts` → FAIL (даты в старом формате «30 мая – 8 июня»).

- [ ] **Step 3: Реализация**

Заменить `PAMYATKA_SHIFTS` (строки 19–58) на:

```ts
import { allShiftsIncludingArchived, shiftDatesFull, SEASON_YEAR } from './shifts';

// CRM group_id → id смены на сайте. ⚠️ Нумерация CRM ≠ нумерации сайта:
// «2 смена» CRM = сайтовая Смена 2.1, «3 смена» CRM = 2.2, «4 смена» CRM = 2 — сверено по датам.
const GROUP_TO_SHIFT: Record<number, string> = {
  660: 'shift-1',
  661: 'shift-2-1',
  662: 'shift-2-2',
  663: 'shift-2',
  664: 'shift-3', // ← подставить ПОДТВЕРЖДЁННЫЙ group_id из Альфа-CRM (Step 1)
  665: 'shift-4', // ← подставить ПОДТВЕРЖДЁННЫЙ group_id из Альфа-CRM (Step 1)
};

const MANAGER = { manager: 'Progaschool', phone: '+79688086455', phoneDisplay: '+7 (968) 808-64-55' };
const _byId = Object.fromEntries(allShiftsIncludingArchived.map(s => [s.id, s]));

export const PAMYATKA_SHIFTS: Record<number, PamyatkaShift> = Object.fromEntries(
  Object.entries(GROUP_TO_SHIFT).map(([gidStr, shiftId], i) => {
    const gid = Number(gidStr);
    const num = String(i + 1); // номер в CRM-нумерации
    return [gid, {
      groupId: gid, num, name: `${num} смена`,
      dates: `${shiftDatesFull(_byId[shiftId])} ${SEASON_YEAR}`,
      ...MANAGER,
    }];
  }),
);
```

(Тире меняется с «–» на «—» — единый формат shiftDatesFull; для памятки это косметика.)

- [ ] **Step 4: Тесты зелёные + Commit**

Run: `npx vitest run` → PASS.

```bash
git add src/data/pamyatkaShifts.ts src/data/pamyatkaShifts.test.ts
git commit -m "fix(pamyatka): даты из shifts.ts, добавлены августовские группы Смен 3/4"
```

---

### Task 8: Стражи v2 — закрыть слепые зоны

**Files:**
- Modify: `scripts/check-price-drift.sh` (полная замена python-части)
- Modify: `scripts/check-date-drift.sh` (добавить ISO-проверку и форму «с X по Y», расширить обход)
- Create: `scripts/check-vychet-drift.sh`
- Modify: `package.json` (`check:vychet` + в цепочку `guard`)

Принцип (память feedback-static-guards-over-llm-review): механику — грепу, канон вычисляется из shifts.ts, ничего в стражах не хардкодится, кроме контекст-паттернов.

- [ ] **Step 1: check-price-drift.sh — naked-числа, новые каталоги, вычисляемый ALLOW**

Заменить python-часть целиком:

```python
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
canon={re.sub(r'\D','',m.group(1)) for m in re.finditer(r"price:\s*'([^']*)'",src)}
canon={c for c in canon if c}
if not canon: print('❌ нет цен в shifts.ts'); sys.exit(2)
# Пары (цена, дни) каждой смены — из блоков Shift (duration идёт раньше price)
pairs=re.findall(r"duration:\s*'(\d+)[^']*'[\s\S]{0,400}?price:\s*'([^']+)'",src)
edu_parts={str(max(int(re.sub(r'\D','',p))-3800*int(d),0)) for d,p in pairs}
# ALLOW = образовательные части (вычисляются, не хардкодятся) + лимиты НК РФ
ALLOW=edu_parts|{'110000','40000'}
EXCL=('/demo/','/_archive','dlya-kompaniy','lanit-v5','lanit-v6','design-v2','glass-','hyperui',
      'it-lager-vs-kruzhok','kak-provesti-leto-s-polzoy','skolko-stoit-detskiy-lager',
      'kuda-det-rebenka-letom','kuda-otdat-rebenka-na-leto','strakhovka-v-lager',
      'tarif-trevozhniy-roditel','nedorogoy-lager','putyovki-v-lager',
      '.test.','timeline/','staff-','heroVariants.test')
P_RUB=re.compile(r'(\d{2,3}[   ]?\d{3})\s*₽')
# Naked-числа только в ценовом контексте — JSON-LD "price", basePrice, price:/price=
P_NAKED=re.compile(r'(?:"price"|\bprice\b|basePrice)\s*[:=]\s*["\']?(\d{5,6})\b')
drift={}
def check(p,i,v,tok):
    if not (40000<=int(v)<=110000): return
    if v in canon or v in ALLOW: return
    drift.setdefault(p,[]).append((i,tok.strip()))
for base in ['src/pages','src/components','src/lib','src/scripts','src/data']:
    for root,_,files in os.walk(base):
        if '_archive' in root or '/demo' in root: continue
        for fn in files:
            if not fn.endswith(('.astro','.md','.ts','.tsx','.json')): continue
            p=os.path.join(root,fn)
            if p.endswith(('shifts.ts','dynamicPrices.ts')): continue
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8'),1):
                for m in P_RUB.finditer(line): check(p,i,re.sub(r'\D','',m.group(1)),m.group(0))
                for m in P_NAKED.finditer(line): check(p,i,m.group(1),m.group(0))
if drift:
    print('❌ ДРЕЙФ ЦЕН СМЕН (нет в shifts.ts; каноны: '+', '.join(sorted(canon))+'):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits: print(f'   {p}:{ln}  «{tok}»')
    print(f'\nФайлов с дрейфом: {len(drift)}. Привести к канону shifts.ts.')
    sys.exit(1)
print(f'✅ Дрейфа цен смен нет. Каноны: {", ".join(str(c) for c in sorted(int(x) for x in canon))} ₽')
```

Изменения против старого: + `src/scripts`, `src/data`, `.json`; + naked-паттерн; `/corp/` и `lager-obnisk` из EXCL УБРАНЫ (после Task 3/5 они чистые); ALLOW-суммы 45800/47900 вычисляются, 50000 удалён.

- [ ] **Step 2: Проверить страж на текущем дереве и selftest-нарушением**

Run: `npm run check:prices` → зелёный (Tasks 2–6 уже убрали нарушения; если красный — это пропущенный хардкод, чинить ЕГО, не страж).
Selftest: `echo 'const x = { basePrice: 91900 };' >> src/data/landing-pages.ts && npm run check:prices; git checkout -- src/data/landing-pages.ts`
Expected: `❌ ДРЕЙФ ЦЕН СМЕН … «basePrice: 91900»`, после checkout `npm run check:prices` зелёный.

- [ ] **Step 3: check-date-drift.sh — ISO-даты и «с X по Y»**

В python-часть добавить (рядом с существующими паттернами; обход расширить: `for base in ['src/pages','src/components','src/data','src/scripts','src/lib']`, в EXCL добавить `'timeline/','staff-','reviews','kak-proshla','.test.','seasons.ts','pamyatkaShifts'` — pamyatka теперь производный, seasons — превью-сезоны вне лета):

```python
# ISO-литералы в диапазоне сезона, не совпадающие с канон-датами смен
iso_canon=set(re.findall(r"(?:startDate|endDate):\s*'(\d{4}-\d{2}-\d{2})'",src))
lo,hi=min(iso_canon),max(iso_canon)
P_ISO=re.compile(r"['\"](\d{4}-\d{2}-\d{2})['\"]")
CTX_OK=re.compile(r'datePublished|dateModified|validFrom|uploadDate|TODAY|Сборк')
# … внутри цикла по строкам:
                if not CTX_OK.search(line):
                    for m in P_ISO.finditer(line):
                        v=m.group(1)
                        if lo<=v<=hi and v not in iso_canon:
                            drift.setdefault(p,[]).append((i,m.group(0)))
# Форма «с 30 мая по 26 августа» — сверяем с канон-диапазонами и границами сезона
P_S_PO=re.compile(r'с\s+(\d{1,2})\s+([а-яё]+)\s+по\s+(\d{1,2})\s+([а-яё]+)')
season_bounds=(int(lo[8:10]),int(lo[5:7]),int(hi[8:10]),int(hi[5:7]))
# … внутри цикла:
                for m in P_S_PO.finditer(line):
                    a_m=mon_idx.get(m.group(2)); b_m=mon_idx.get(m.group(4))
                    if a_m and b_m:
                        t=(int(m.group(1)),a_m,int(m.group(3)),b_m)
                        if t not in canon and t!=season_bounds:
                            drift.setdefault(p,[]).append((i,m.group(0)))
```

(`src` уже прочитан в начале скрипта; вставить сборку `iso_canon` и `P_*` до цикла, проверки — в цикл по строкам.)

- [ ] **Step 4: Selftest date-стража**

Run: `npm run check:dates` → зелёный.
Selftest: `echo "const bad = '2026-08-05';" >> src/data/landing-pages.ts && npm run check:dates; git checkout -- src/data/landing-pages.ts` → красный с `«'2026-08-05'»`, после отката зелёный.

- [ ] **Step 5: Новый scripts/check-vychet-drift.sh**

```bash
#!/usr/bin/env bash
# Страж сумм налогового вычета. Канон ВЫЧИСЛЯЕТСЯ из shifts.ts:
# round13%(min(цена − 3800×дни, 110000)) в округлениях до 50 и до 100 (и floor до 100 — «от X»).
# Плюс жёсткий бан «5 434» (устаревшая цифра, CLAUDE.md) — везде, включая scripts/.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"; cd "$(dirname "$SCRIPT_DIR")"
python3 << 'PY'
import re,sys,os
src=open('src/data/shifts.ts',encoding='utf-8').read()
pairs=re.findall(r"duration:\s*'(\d+)[^']*'[\s\S]{0,400}?price:\s*'([^']+)'",src)
allowed=set()
for d,p in pairs:
    price=int(re.sub(r'\D','',p)); days=int(d)
    v=round(min(max(price-3800*days,0),110000)*0.13)
    for r in (round(v/50)*50, round(v/100)*100, v//100*100): allowed.add(str(r))
BAN=re.compile(r'5\s?434')
P_SUM=re.compile(r'(\d{1,2}[   ]?\d{3})\s*₽')
CTX=re.compile(r'вычет|верн[её]|ФНС|НДФЛ',re.I)
EXCL=('/_archive','/demo/','node_modules','eval-graders','.test.','lanit','check-vychet','5 434')
drift={}
for base in ['src','scripts']:
    for root,_,files in os.walk(base):
        if any(x in root for x in ('_archive','node_modules','demo')): continue
        for fn in files:
            if not fn.endswith(('.astro','.ts','.tsx','.md','.js','.mjs','.json')): continue
            p=os.path.join(root,fn)
            if any(x in p for x in EXCL): continue
            for i,line in enumerate(open(p,encoding='utf-8',errors='ignore'),1):
                if BAN.search(line):
                    drift.setdefault(p,[]).append((i,'запрещённая цифра 5 434')); continue
                if not CTX.search(line): continue
                for m in P_SUM.finditer(line):
                    v=re.sub(r'\D','',m.group(1))
                    if 1000<=int(v)<=15000 and v not in allowed:
                        drift.setdefault(p,[]).append((i,m.group(0).strip()))
if drift:
    print('❌ ДРЕЙФ СУММ ВЫЧЕТА (канон вычисляется из shifts.ts: '+', '.join(sorted(allowed,key=int))+'):')
    for p,hits in sorted(drift.items()):
        for ln,tok in hits: print(f'   {p}:{ln}  «{tok}»')
    sys.exit(1)
print('✅ Суммы вычета соответствуют формуле из shifts.ts; «5 434» отсутствует.')
PY
```

`package.json`: добавить `"check:vychet": "bash scripts/check-vychet-drift.sh"`, в `guard` вставить `&& bash scripts/check-vychet-drift.sh` сразу после `check-price-drift.sh`.

- [ ] **Step 6: Selftest vychet-стража и полный прогон**

Run: `bash scripts/check-vychet-drift.sh` → зелёный. Если красный — реальные дрейфы (например, суммы в статьях `nalogovyj-vychet`), привести их к `VYCHET_*`-константам или, если это исторический/рыночный контекст, добавить файл в EXCL с комментарием-причиной.
Selftest: `echo '<!-- вычет вернёте 5 434 ₽ -->' >> src/pages/lager-obnisk.astro && npm run check:vychet; git checkout -- src/pages/lager-obnisk.astro` → красный, после отката зелёный.
Итог: `npm run guard` → зелёный целиком.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-price-drift.sh scripts/check-date-drift.sh scripts/check-vychet-drift.sh package.json
git commit -m "feat(guards): naked-цены и ISO-даты в JSON-LD, каталоги src/scripts+src/data, страж сумм вычета с баном 5 434"
```

---

### Task 9: Финальная проверка, PR в dev, post-deploy smoke

- [ ] **Step 1: Полный локальный прогон**

```bash
npm run guard && npx vitest run && npm run build
```

Expected: всё зелёное, билд собрался (build сам гоняет guard).

- [ ] **Step 2: Сверка JSON-LD в собранном dist**

```bash
node -e "
const fs=require('fs');
const html=fs.readFileSync('dist/client/ceny/index.html','utf8');
const blocks=[...html.matchAll(/<script type=\"application\/ld\+json\">(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
const events=blocks.flat().filter(b=>b['@type']==='Event');
console.log('Event-блоков:',events.length);
for(const e of events) console.log(e.name,'|',e.startDate,'→',e.endDate,'|',e.offers.price,e.offers.availability.split('/').pop());
if(events.length<6) process.exit(1);
"
grep -c "5 434" dist/client -r || echo "OK: 5 434 нет в dist"
grep -rn "{PRICE_MIN}\|{OPEN_" dist/client/index.html && exit 1 || echo "OK: токены hero раскрыты"
```

Expected: 6 Event-блоков, у завершённых SoldOut, у 3/4 — InStock с текущей (растущей) ценой; токенов и «5 434» в dist нет.

- [ ] **Step 3: PR в dev**

```bash
git push -u origin HEAD
gh pr create --base dev --title "Хардкод цен/дат/вычета → источник правды + стражи v2" --body "По плану docs/superpowers/plans/2026-07-29-sot-hardcode-cleanup.md (аудит 29.07). Ключевое: /ask/ на импортах, JSON-LD динамический (убран InStock за 48 000 ₽ на 3 стр.), бан 5 434 в seo-factory, лимит вычета 110 000 в obnisk, hero-плейсхолдеры, памятка Смен 3/4, стражи ловят naked-числа/ISO/вычет. ⚠️ Если group_id 664/665 не подтверждены — августовские группы памятки закомментированы, см. Task 7."
```

Ревью владельцем/код-ревью → мерж в dev (автодеплой dev→prod по цепочке).

- [ ] **Step 4: Post-deploy smoke (после автодеплоя, ~10–15 мин)**

```bash
curl -s https://aidacamp.ru/ceny/ | grep -o '"price":"[0-9]*"' | sort | uniq -c
curl -s https://aidacamp.ru/detskiy-lager-podmoskove/ | grep -c '"price":"48000"' || echo "OK: 48000-оффер ушёл"
curl -s https://aidacamp.ru/ask/ >/dev/null && echo "ask OK"
```

Expected: цены на /ceny/ = текущие динамические, `"48000"` как InStock-оффер отсутствует, /ask/ отвечает 200 (виджет проверить глазами: смены/цены совпадают с /ceny/).

---

## Риски и заметки

- **SEO:** URL и заголовки не меняются; в JSON-LD меняются ЗНАЧЕНИЯ (намеренная чистка ложных офферов). Видимые тексты меняются точечно (obnisk, podmoskove, hero-подписи) — риск позиций минимальный, актуальность растёт.
- **ask.ts:** заполняемость смен в виджете начнёт совпадать с shifts.ts (раньше расходилась) — визуально изменятся проценты. Это фича.
- **Стражи:** после расширения могут поймать хвосты, не найденные аудитом, — чинить контент, а не ослаблять страж; EXCL пополнять только с комментарием-причиной.
- **Память:** `feedback-merge-only-to-dev` (PR только в dev), `feedback_astro_no_tests_under_pages`, `feedback-static-guards-over-llm-review`, `feedback-minimal-moving-parts` — соблюдены.

## Self-Review (выполнено при написании)

- Покрытие аудита: P1–P16 ✓ (P16=obnisk в Task 5), D1–D10 ✓ (D8 staff и D11/D12 — сознательно EXCL), V1–V4 ✓, V5 — ложное срабатывание (не трогаем), V6 ✓ (ALLOW вычисляется), L1–L6 ✓, дыры стражей 1–8 ✓.
- Типы/имена сквозные: `SEASON_START_ISO`/`SEASON_END_ISO`/`OPEN_DAYS_PHRASE` (Task 1) ← Tasks 3,4,6; `shiftPriceStr`/`ldPrice` — локальные хелперы, определены в каждом файле использования.
- Плейсхолдеров «TBD» нет; каждый код-шаг содержит код.
