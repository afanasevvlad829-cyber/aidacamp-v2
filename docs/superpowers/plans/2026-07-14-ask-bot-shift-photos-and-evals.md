# Ask-бот: честные фото по сменам + eval-контур — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Закрыть три найденных дефекта продакшен-бота на aidacamp.ru/ask/ — (1) текстовые ответы про визуальные темы (питание/бассейн/территория) не предлагают фото; (2) вопрос «фото с последней смены» не может быть честно отвечен — ни один источник фото не размечен по сменам, а бот всё равно отвечает так, будто разметка есть; (3) нет воспроизводимого способа проверить промпт-изменения бота до деплоя (только ручной клик в браузере) — и завести такой контур по документированной внешней методологии, а не изобретённой.

**Architecture:** Расширяем уже существующие куски инфраструктуры вместо новых с нуля: (а) банк чипов и правила `block_type` в `src/lib/ai/systemPrompt.ts`; (б) новая чистая функция в `src/data/shifts.ts`, определяющая «последнюю прошедшую смену» по датам (аналог уже существующего `getShiftPhase`); (в) `findPhotos()` в `src/lib/ai/photoSearch.ts` учится фильтровать по смене, когда данные это позволяют, и честно отказывается, когда не позволяют; (г) уже существующий браузерный «мама-тестировщик» (`src/pages/ask-test.astro` + `/api/ask-test-mama`) получает headless CLI-режим с логированием и автоматическими грейдерами — это ровно то, что Anthropic называет eval-driven development (см. источники ниже), просто мы не строим его с нуля, а достраиваем то, что уже есть.

**Tech Stack:** Astro API routes, TypeScript, Anthropic SDK (`claude-sonnet-4-5`/`claude-haiku-4-5`), vitest (юнит-тесты чистых функций), Node-скрипты (по конвенции `scripts/*.mjs`), Postgres (`ai_ask_sessions` — источник golden-кейсов).

## Обоснование методологии (внешние источники, не придумано)

- [Anthropic — Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents): начинать рано, 20–50 кейсов из **реальных провалов** — не ждать сотен синтетических тестов; смешивать code-based грейдеры (быстрые, детерминированные) и model-based грейдеры (для тона/позиционирования); читать транскрипты регулярно, чтобы грейдер не врал.
- [Anthropic — Using the Evaluation Tool](https://platform.claude.com/docs/en/docs/test-and-evaluate/eval-tool): практика side-by-side сравнения версий промпта на одном наборе кейсов — прогонять весь набор заново при каждом изменении промпта, а не полагаться на «покликал руками, вроде ок».
- [Anthropic — Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval): у retrieval-систем должна быть возможность сузить поиск по метаданным (в нашем случае — по смене) до векторного/тегового поиска; без единообразных метаданных на всех записях retrieval «теряет» релевантные документы — ровно наша ситуация с фото без поля `shift`.
- Проектное правило `CLAUDE.md` → «Факты vs гипотезы»: «Не найдено — честный ответ, лучше чем додумать». Применяем это буквально к фото: пока нет достоверной привязки фото→смена, бот обязан не выдавать общие фото за фото «именно с последней смены».

## Global Constraints

- Комментарии в коде и весь текст бота — на русском.
- Цены/даты нигде не хардкодятся вне `src/data/shifts.ts` (`npm run check:prices` / `check:dates` падают на нарушение).
- Никогда не выдумывать факты о лагере/сменах — только то, что подтверждено данными.
- Никаких эмодзи в UI бота (в тестовом харнессе `ask-test.astro` эмодзи уже используются для персон — это внутренний dev-инструмент, не UI бота, трогать не нужно).
- Изменения в `systemPrompt.ts` — продакшен-файл, влияет на все живые диалоги сразу после деплоя на dev/prod. Каждую правку промпта проверять эвал-раном (Task 1) до и после.
- Хирургические изменения — расширяем существующие файлы/паттерны, не создаём параллельные системы.

---

### Task 1: Headless-раннер для «мама-тестировщика» + code-based грейдеры

Уже существующий `src/pages/ask-test.astro` — это ручной браузерный харнесс с 5 персонами мам, гоняющий диалог `мама-LLM ↔ /api/ask`. Он не сохраняет транскрипты и не проверяет результат автоматически. Делаем headless-версию той же логики как Node-скрипт (без браузера, против уже задеплоенного `/api/ask` на dev), плюс детерминированные грейдеры.

**Files:**
- Create: `scripts/eval-ask-bot.mjs`
- Create: `scripts/eval-cases/golden.json`
- Create: `scripts/eval-graders.mjs`
- Test: `scripts/eval-graders.test.mjs` (запускается через `node --test`, т.к. это plain Node-скрипт вне vitest-конфига `src/`)
- Modify: `package.json` (добавить `"eval:ask": "node scripts/eval-ask-bot.mjs"`)

**Interfaces:**
- Produces: `runGraders(caseDef, botResponse) → { passed: boolean, failures: string[] }` — используется в Task 6 (регрессия после фиксов).
- Produces: файл-отчёт `scripts/eval-reports/<timestamp>.json` со структурой `{ case_id, question, response, graders: {name: passed} }[]`.

- [ ] **Шаг 1: Собрать golden-кейсы из реальных провалов**

Это не юнит-тест, а данные. Источник — реальные вопросы про фото/еду из `ai_ask_sessions` (владелец уже подтверждал доступ к этой таблице раньше в этой сессии для диагностики) плюс два кейса, воспроизведённых вручную в этом расследовании (см. историю сессии): «Покажите фотографии столовой» (сработало верно) и «Как кормят?» (текст без фото — баг из Task 2) и «покажи фото с последней смены» (баг из Task 4/5).

Создать `scripts/eval-cases/golden.json`:

```json
{
  "cases": [
    {
      "id": "photo-food-explicit",
      "question": "Покажите фотографии столовой",
      "graders": ["has_gallery", "no_banned_words"]
    },
    {
      "id": "photo-food-implicit",
      "question": "Как кормят?",
      "graders": ["offers_photo_chip", "no_banned_words"]
    },
    {
      "id": "photo-pool-implicit",
      "question": "Расскажите про бассейн",
      "graders": ["offers_photo_chip", "no_banned_words"]
    },
    {
      "id": "photo-last-shift",
      "question": "Покажи фото с последней смены",
      "graders": ["honest_about_shift_limits", "no_banned_words"]
    },
    {
      "id": "price-shift3",
      "question": "Сколько стоит смена 3?",
      "graders": ["mentions_correct_price_s3", "no_banned_words"]
    },
    {
      "id": "tax-deduction",
      "question": "Какой налоговый вычет за смену 1?",
      "graders": ["no_hardcoded_stale_deduction", "no_banned_words"]
    }
  ]
}
```

(Полный набор — 20–50 кейсов по [рекомендации Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents); здесь ядро в 6 — расширяется по мере находок, каждый новый баг из живых логов становится новым кейсом.)

- [ ] **Шаг 2: Написать детерминированные грейдеры**

Создать `scripts/eval-graders.mjs`:

```js
// Code-based грейдеры для eval-ask-bot.mjs — детерминированные, без LLM.
// Каждый грейдер: (botResponse) => { passed: boolean, reason?: string }

import { SHIFT_META } from '../src/data/shifts.ts';

const BANNED_WORDS = ['единиц', 'единицы', 'единицами', 'баллов', 'баллы', 'балла', 'балл'];

export function no_banned_words(resp) {
  const text = (resp.text || '').toLowerCase();
  const hit = BANNED_WORDS.find(w => text.includes(w));
  return hit
    ? { passed: false, reason: `запрещённое слово "${hit}" в тексте` }
    : { passed: true };
}

export function has_gallery(resp) {
  const ok = resp.block_type === 'gallery' && Array.isArray(resp.block_data?.photos) && resp.block_data.photos.length > 0;
  return ok ? { passed: true } : { passed: false, reason: `block_type=${resp.block_type}, photos=${resp.block_data?.photos?.length ?? 0}` };
}

export function offers_photo_chip(resp) {
  const hasGallery = resp.block_type === 'gallery';
  const chipOffersPhoto = (resp.chips || []).some(c => /фото/i.test(c.label || '') || /фото/i.test(c.query || ''));
  return (hasGallery || chipOffersPhoto)
    ? { passed: true }
    : { passed: false, reason: 'ни галереи, ни чипа с "фото" в ответе на визуальную тему' };
}

export function honest_about_shift_limits(resp) {
  const text = (resp.text || '').toLowerCase();
  // Бот не имеет права заявлять "именно с последней смены" / "с прошлой смены" в тексте,
  // пока фото не размечены по сменам (см. Task 4/5) — иначе это фактическая ложь пользователю.
  const claimsSpecificShift = /именно с (последней|прошлой|\d)|фото с \d-?й? смены/.test(text);
  return claimsSpecificShift
    ? { passed: false, reason: `текст утверждает конкретную смену без реальной привязки фото: "${resp.text}"` }
    : { passed: true };
}

export function mentions_correct_price_s3(resp) {
  const price = SHIFT_META['shift-3'].basePrice;
  const priceStr = price.toLocaleString('ru-RU');
  return (resp.text || '').includes(priceStr)
    ? { passed: true }
    : { passed: false, reason: `ожидали цену смены 3 (${priceStr}) в тексте, не нашли` };
}

export function no_hardcoded_stale_deduction(resp) {
  // Известные устаревшие цифры вычета, которые запрещено упоминать (см. CLAUDE.md).
  const STALE = ['5 434', '5434', '5 200 ₽ (максимум'];
  const hit = STALE.find(s => (resp.text || '').includes(s));
  return hit ? { passed: false, reason: `устаревшая цифра вычета "${hit}"` } : { passed: true };
}

export const GRADERS = {
  no_banned_words, has_gallery, offers_photo_chip,
  honest_about_shift_limits, mentions_correct_price_s3, no_hardcoded_stale_deduction,
};

export function runGraders(caseDef, botResponse) {
  const failures = [];
  for (const name of caseDef.graders) {
    const fn = GRADERS[name];
    if (!fn) { failures.push(`неизвестный грейдер "${name}"`); continue; }
    const r = fn(botResponse);
    if (!r.passed) failures.push(`${name}: ${r.reason}`);
  }
  return { passed: failures.length === 0, failures };
}
```

- [ ] **Шаг 3: Тест грейдеров на фикстурах (не на живом боте)**

Создать `scripts/eval-graders.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runGraders } from './eval-graders.mjs';

test('has_gallery: проходит когда есть фото', () => {
  const r = runGraders(
    { graders: ['has_gallery'] },
    { block_type: 'gallery', block_data: { photos: [{ url: '/a.avif' }] } }
  );
  assert.equal(r.passed, true);
});

test('has_gallery: падает без фото', () => {
  const r = runGraders(
    { graders: ['has_gallery'] },
    { block_type: null, block_data: null }
  );
  assert.equal(r.passed, false);
  assert.match(r.failures[0], /has_gallery/);
});

test('offers_photo_chip: проходит если есть чип с "фото" даже без галереи', () => {
  const r = runGraders(
    { graders: ['offers_photo_chip'] },
    { block_type: null, chips: [{ label: 'Фото столовой', query: 'покажи фото столовой' }] }
  );
  assert.equal(r.passed, true);
});

test('offers_photo_chip: падает если нет ни галереи, ни чипа', () => {
  const r = runGraders(
    { graders: ['offers_photo_chip'] },
    { block_type: null, chips: [{ label: 'Смены и цены', query: 'смены' }] }
  );
  assert.equal(r.passed, false);
});

test('honest_about_shift_limits: падает если текст утверждает конкретную смену', () => {
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Вот фото именно с последней смены!' }
  );
  assert.equal(r.passed, false);
});

test('honest_about_shift_limits: проходит на честной формулировке', () => {
  const r = runGraders(
    { graders: ['honest_about_shift_limits'] },
    { text: 'Точно сортировать фото по смене пока не можем — вот живые фото с наших смен.' }
  );
  assert.equal(r.passed, true);
});
```

- [ ] **Шаг 4: Запустить тесты грейдеров, убедиться что проходят**

Run: `node --test scripts/eval-graders.test.mjs`
Expected: `# pass 6`, `# fail 0`

- [ ] **Шаг 5: Headless-раннер, вызывающий живой `/api/ask`**

Создать `scripts/eval-ask-bot.mjs`:

```js
#!/usr/bin/env node
// Headless-версия ask-test.astro: гоняет golden-кейсы против /api/ask и грейдит ответы.
// Использование: BASE_URL=https://dev.aidacamp.ru node scripts/eval-ask-bot.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runGraders } from './eval-graders.mjs';

const BASE_URL = process.env.BASE_URL || 'https://dev.aidacamp.ru';
const { cases } = JSON.parse(readFileSync(new URL('./eval-cases/golden.json', import.meta.url)));

async function askBot(message) {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const results = [];
  let failed = 0;
  for (const c of cases) {
    process.stdout.write(`▸ ${c.id}: "${c.question}" ... `);
    let resp, error = null;
    try {
      resp = await askBot(c.question);
    } catch (e) {
      error = e.message;
    }
    const graded = resp ? runGraders(c, resp) : { passed: false, failures: [`запрос упал: ${error}`] };
    if (!graded.passed) failed++;
    console.log(graded.passed ? 'OK' : `FAIL (${graded.failures.join('; ')})`);
    results.push({ case_id: c.id, question: c.question, response: resp ?? null, ...graded });
  }

  mkdirSync(new URL('./eval-reports/', import.meta.url), { recursive: true });
  const reportPath = new URL(`./eval-reports/${Date.now()}.json`, import.meta.url);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n${cases.length - failed}/${cases.length} passed. Отчёт: ${reportPath.pathname}`);
  if (failed > 0) process.exit(1);
}

main();
```

- [ ] **Шаг 6: Добавить npm-скрипт**

Modify `package.json` scripts-блок — добавить рядом с `"check:banned"`:
```json
"eval:ask": "node scripts/eval-ask-bot.mjs",
```

- [ ] **Шаг 7: Прогнать против dev, получить baseline (ожидаем провалы — это нормально, фиксим в Task 2-5)**

Run: `BASE_URL=https://dev.aidacamp.ru npm run eval:ask`
Expected: кейсы `photo-food-implicit`, `photo-pool-implicit`, `photo-last-shift` — FAIL (это baseline, подтверждающий найденные баги). Остальные — OK. Сохранить путь отчёта для сравнения в Task 6.

- [ ] **Шаг 8: Commit**

```bash
git add scripts/eval-ask-bot.mjs scripts/eval-cases/golden.json scripts/eval-graders.mjs scripts/eval-graders.test.mjs package.json
git commit -m "test: headless eval-раннер для ask-бота (golden-кейсы + code-грейдеры)"
```

---

### Task 2: Чип-подсказка на фото для текстовых ответов по визуальным темам

Закрывает баг «Как кормят?» → текст без единого пути к фото (см. `src/lib/ai/systemPrompt.ts:206`, найдено вживую через `/ask/`).

**Files:**
- Modify: `src/lib/ai/systemPrompt.ts:230-239` (банк чипов)
- Modify: `src/lib/ai/systemPrompt.ts:206` (правило)

**Interfaces:**
- Consumes: ничего нового — правит только текст промпта, отправляемого в Anthropic API.
- Produces: чипы вида `{"label":"Фото столовой","query":"покажи фото столовой"}` в ответах бота на визуальные темы без явного «фото»/«покажи».

- [ ] **Шаг 1: Добавить правило про обязательный photo-чип**

В `src/lib/ai/systemPrompt.ts` заменить строку 206:

```
- ОДИН конкретный вопрос БЕЗ слов «фото»/«покажи» (питание, бассейн, медицина, охрана отдельно) → block_type: null, ответь коротко в тексте
```

на:

```
- ОДИН конкретный вопрос БЕЗ слов «фото»/«покажи» (питание, бассейн, медицина, охрана отдельно) → block_type: null, ответь коротко в тексте
- Если тема визуальная (питание/еда, бассейн, территория, номера/проживание, занятия, хакатон) и ты ответил текстом (block_type: null) — ОБЯЗАТЕЛЬНО добавь в chips вариант «Фото [темы]» с query «покажи фото [темы]» (например {"label":"Фото столовой","query":"покажи фото столовой"}), чтобы у мамы был путь увидеть фото в один клик, даже если она сама не попросила
```

- [ ] **Шаг 2: Добавить пример в банк чипов**

В `src/lib/ai/systemPrompt.ts` рядом со строкой 235 (`{"label":"Как с едой?","query":"питание в лагере"}`) добавить:

```
- {"label":"Фото столовой","query":"покажи фото столовой"}
- {"label":"Фото бассейна","query":"покажи фото бассейна"}
```

- [ ] **Шаг 3: Деплой на dev и прогон эвала**

```bash
./scripts/deploy-server.sh dev
BASE_URL=https://dev.aidacamp.ru npm run eval:ask
```
Expected: `photo-food-implicit` и `photo-pool-implicit` переходят FAIL → OK. Остальные кейсы не сломались.

- [ ] **Шаг 4: Commit**

```bash
git add src/lib/ai/systemPrompt.ts
git commit -m "fix(ask-bot): чип 'Фото темы' для текстовых ответов на визуальные вопросы"
```

---

### Task 3: `lastCompletedShift()` — честное определение «последней смены» по датам

Данные для этого уже есть в `SHIFT_META` (`src/data/shifts.ts`) — не хватает только функции, которая находит смену с максимальной `endDate`, у которой `endDate < today`. Аналог уже существующего `getShiftPhase()` в `src/data/dynamicPrices.ts:185`, но не завязана на конкретный `shiftId`.

**Files:**
- Modify: `src/data/shifts.ts` (добавить функцию рядом с `upcomingShifts`, строка 126)
- Modify: `src/data/shifts.test.ts` (файл УЖЕ СУЩЕСТВУЕТ на `dev` — 26 тестов: `mainShifts`, `PRICE_MIN / PRICE_MAX`, `SHIFT_META`, `getCurrentPrice`, `taxDeduction`, `shiftDeduction`, `price / vychet exports`, `date exports`. Не создавать заново — дописать новый `describe('lastCompletedShift', ...)` в конец файла. Существующий блок импортов из `./shifts` (строки 2-16) сейчас НЕ включает `lastCompletedShift` и `displayShifts` — добавить оба имени в этот блок, ничего в нём не удаляя)

**Interfaces:**
- Produces: `lastCompletedShift(today: string): Shift | null` — используется в Task 4 (`src/pages/api/ask.ts`).

- [ ] **Шаг 1: Написать падающий тест**

Дописать в конец `src/data/shifts.test.ts` (добавить `lastCompletedShift` в существующий `import { ... } from './shifts'` наверху файла, НЕ создавать новый файл и НЕ трогать существующие 26 тестов):

```ts
describe('lastCompletedShift', () => {
  it('находит самую позднюю смену с endDate < today', () => {
    const s = lastCompletedShift('2026-07-14');
    expect(s?.id).toBe('shift-2'); // endDate 2026-06-23, позже чем у shift-1 (2026-06-08)
  });

  it('возвращает null, если ни одна смена ещё не завершилась', () => {
    const s = lastCompletedShift('2026-01-01');
    expect(s).toBeNull();
  });

  it('смена, которая идёт прямо сейчас (today внутри диапазона) — не считается завершённой', () => {
    const s = lastCompletedShift('2026-06-15'); // внутри shift-2 (10-23 июня)
    expect(s?.id).not.toBe('shift-2');
  });

  it('рассматривает все смены из displayShifts, не только mainShifts', () => {
    // displayShifts включает завершённые _shift1/_shift2 — эта проверка ловит регресс,
    // если кто-то случайно перепишет функцию на mainShifts (там завершённых уже нет).
    expect(displayShifts.some(s => s.id === 'shift-2')).toBe(true);
  });
});
```

- [ ] **Шаг 2: Запустить тест, убедиться что падает**

Run: `npx vitest run src/data/shifts.test.ts`
Expected: FAIL — `lastCompletedShift is not a function` (или ошибка импорта).

- [ ] **Шаг 3: Реализовать функцию**

В `src/data/shifts.ts` добавить сразу после `upcomingShifts` (после строки 129):

```ts
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
```

- [ ] **Шаг 4: Запустить тест, убедиться что проходит**

Run: `npx vitest run src/data/shifts.test.ts`
Expected: `4 passed`

- [ ] **Шаг 5: Commit**

```bash
git add src/data/shifts.ts src/data/shifts.test.ts
git commit -m "feat(shifts): lastCompletedShift() — честное определение последней прошедшей смены"
```

---

### Task 4: Честный ответ бота на «фото/итоги с последней смены» (без выдумывания привязки)

До тех пор, пока реальные фото не размечены по сменам (см. Task 5 — частично заблокирован), бот должен **называть смену по имени** (используя `lastCompletedShift()`) в тексте, но **не приписывать конкретные фото именно этой смене** — честно говорить, что показывает общие живые фото с лагеря. Это прямое применение правила проекта «не найдено — честный ответ, лучше чем додумать».

**Files:**
- Modify: `src/pages/api/ask.ts` (добавить резолв смены перед вызовом LLM)
- Modify: `src/lib/ai/systemPrompt.ts` (инструкция для LLM, как формулировать честно)

**Interfaces:**
- Consumes: `lastCompletedShift(today)` из Task 3.
- Produces: `volatileSuffix` в `ask.ts` получает блок `=== ПОСЛЕДНЯЯ СМЕНА ===`, который LLM обязан использовать вместо угадывания.

- [ ] **Шаг 1: Прокинуть имя последней смены в промпт**

В `src/pages/api/ask.ts` рядом с блоком `intentBoost` (после строки 215, перед `const ctxForLLM = ...`) добавить:

```ts
import { lastCompletedShift } from '../../data/shifts';
// ...
const _today = new Date().toISOString().slice(0, 10);
const _lastShift = lastCompletedShift(_today);
const shiftContext = _lastShift
  ? `\n\n=== ПОСЛЕДНЯЯ ПРОШЕДШАЯ СМЕНА ===\nСмена: "${_lastShift.name}" (${_lastShift.dates}).\n` +
    `ВАЖНО: у нас пока НЕТ фото, размеченных по конкретной смене — если тебя просят "фото с последней смены",\n` +
    `назови смену по имени (${_lastShift.name}), но честно скажи что показываешь ОБЩИЕ живые фото с лагеря,\n` +
    `а не фото именно с этой смены. НЕ утверждай "вот фото именно с ${_lastShift.name}" — это неправда.`
  : '';
```

(Импорт `lastCompletedShift` добавить в блок импортов вверху файла, рядом с существующим `import { findPhotos } from '../../lib/ai/photoSearch';`.)

- [ ] **Шаг 2: Включить `shiftContext` в `volatileSuffix`**

Найти строку 221 (`const volatileSuffix = ctxForLLM + intentBoost;`) и заменить на:

```ts
const volatileSuffix = ctxForLLM + intentBoost + shiftContext;
```

- [ ] **Шаг 3: Пояснить LLM формат честного ответа**

В `src/lib/ai/systemPrompt.ts` рядом с примерами про галерею (после строки 197) добавить:

```
Вопрос: "Покажи фото с последней смены" / "как прошла последняя смена"
Если в контексте передана "ПОСЛЕДНЯЯ ПРОШЕДШАЯ СМЕНА" — используй её имя, но НЕ утверждай что фото именно оттуда:
{"state":"ok","text":"Последняя прошедшая смена — Смена 2 (10–23 июня). Фото по конкретным сменам пока не сортируем — вот живые фото с наших смен вообще, атмосфера та же.","block_type":"gallery","block_data":{"query":"занятия программирование дети атмосфера"},"chips":[{"label":"Как прошла Смена 2","query":"как прошла смена 2"},{"label":"Смены и цены","query":"смены"}]}
```

- [ ] **Шаг 4: Деплой на dev, прогон эвала**

```bash
./scripts/deploy-server.sh dev
BASE_URL=https://dev.aidacamp.ru npm run eval:ask
```
Expected: `photo-last-shift` переходит FAIL → OK (`honest_about_shift_limits` проходит).

- [ ] **Шаг 5: Commit**

```bash
git add src/pages/api/ask.ts src/lib/ai/systemPrompt.ts
git commit -m "fix(ask-bot): честный ответ на 'фото с последней смены' — называем смену, не приписываем фото"
```

---

### Task 5: Разметка фото по сменам — из Immich-альбомов (реальный источник, проверен вживую)

**Блокер снят 2026-07-14.** Изначально задача была заблокирована мёртвым `YADISK_TOKEN` (полный каталог `scripts/photo_catalog.json`, 9199 фото, не имеет привязки к смене — только `_год`). Но владелец указал на отдельный self-hosted **Immich** (`/opt/immich`, публично на `https://photos.aidacamp.ru`) — это НЕ архив прошлых лет, а именно свежие фото с последних смен, уже организованные в альбомы:

- Альбом «Смена 1 — 2026» (id `575f1459-c7be-4dc6-88fc-d94375f2b934`) — 860 фото, даты `fileCreatedAt` 2026-05-30…2026-06-08 — **совпадает день-в-день** с `SHIFT_META['shift-1']` (30 мая — 8 июня).
- Альбом «Смена 2 — 2026» (id `8c18cc93-e6de-4699-8d19-9830251c1602`) — 735 фото, 726 из них в диапазоне 2026-06-10…2026-06-21 (реальные даты смены — 10-23 июня), 9 штук датированы 2026-06-29 (поздний бэкфилл, не смущает — попадут в общую подборку без ложной точности).
- API-ключ уже лежит в `/opt/mcp/.env`/`/opt/mcp/MASTER_TOKENS.env` под `IMMICH_API_KEY` (добавлен владельцем 2026-07-14, проверен — `GET /api/server/statistics` отвечает 200).
- У фото в Immich **нет описаний** (`exifInfo.description` пустой везде, проверено) — подписи ставим нейтральные («Фото со Смены N»), не выдумывая деталей на фото.
- Принцип наименования новых альбомов после будущих смен — **«Смена N — YYYY»** (владелец создаёт вручную после каждой смены, как для 1 и 2) — скрипт ниже опирается на этот паттерн через regex, не хардкодит id/номер.

**Files:**
- Create: `scripts/sync-immich-shift-photos.mjs` (тянет альбомы «Смена N — YYYY» из Immich, копирует файлы в единое медиа-хранилище, обновляет `photo-index.json`)
- Modify: `src/data/photo-index.json` (добавить опциональное поле `shift` к записям, где оно известно)
- Modify: `src/lib/ai/photoSearch.ts` (`findPhotos` учится принимать `shiftId` и фильтровать)

**Interfaces:**
- Consumes: `Photo.shift?: string` — новое опциональное поле. `IMMICH_API_KEY` из окружения сервера.
- Produces: `findPhotos(query, count, shiftId?)` — если `shiftId` передан и есть фото с этим `shift`, они идут первыми; если фото со сменой нет вообще — функция ведёт себя как раньше (общий поиск по тегам), **не выдумывая** привязку.

- [ ] **Шаг 1: Написать синк-скрипт (запускается на сервере — там же живёт Immich и `/var/www/aidacamp-media/`)**

Создать `scripts/sync-immich-shift-photos.mjs`:

```js
#!/usr/bin/env node
// Тянет альбомы "Смена N — YYYY" из self-hosted Immich (photos.aidacamp.ru) в единое
// медиа-хранилище сайта и прописывает привязку к смене в photo-index.json.
// Запуск НА СЕРВЕРЕ (там IMMICH_API_KEY и доступ к /var/www/aidacamp-media/):
//   IMMICH_API_KEY=$(grep '^IMMICH_API_KEY=' /opt/mcp/.env | cut -d= -f2-) \
//   node scripts/sync-immich-shift-photos.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const IMMICH_BASE = 'http://127.0.0.1:2283'; // локально на сервере, без внешнего SSL-хопа
const KEY = process.env.IMMICH_API_KEY;
if (!KEY) throw new Error('IMMICH_API_KEY не задан в окружении');

const MEDIA_ROOT = '/var/www/aidacamp-media/images/gallery';
const PHOTO_INDEX_PATH = new URL('../src/data/photo-index.json', import.meta.url);
const PER_SHIFT_LIMIT = 12; // не тянуть все 700+ фото альбома — только разумную подборку

async function immichGet(path) {
  const res = await fetch(`${IMMICH_BASE}${path}`, { headers: { 'x-api-key': KEY } });
  if (!res.ok) throw new Error(`Immich ${path} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const albums = await immichGet('/api/albums');
  const shiftAlbums = albums.filter(a => /^Смена\s+\d+\s+—\s+\d{4}$/.test(a.albumName));
  console.log(`Найдено ${shiftAlbums.length} сменных альбомов:`, shiftAlbums.map(a => a.albumName));

  const index = JSON.parse(readFileSync(PHOTO_INDEX_PATH, 'utf-8'));
  let added = 0;

  for (const album of shiftAlbums) {
    const num = album.albumName.match(/Смена\s+(\d+)/)[1];
    const shiftId = 'shift-' + num;
    const dir = `${MEDIA_ROOT}/smena-${num}`;
    mkdirSync(dir, { recursive: true });

    const detail = await immichGet(`/api/albums/${album.id}`);
    const assets = detail.assets
      .filter(a => a.type === 'IMAGE')
      .sort((a, b) => a.fileCreatedAt.localeCompare(b.fileCreatedAt))
      .slice(0, PER_SHIFT_LIMIT);

    for (const asset of assets) {
      const file = `smena-${num}/${asset.id}.jpg`;
      if (index.photos.some(p => p.file === file)) continue; // уже синкали — не дублируем

      const res = await fetch(`${IMMICH_BASE}/api/assets/${asset.id}/thumbnail?size=preview`, {
        headers: { 'x-api-key': KEY },
      });
      if (!res.ok) { console.warn(`пропуск ${asset.id}: HTTP ${res.status}`); continue; }
      await pipeline(res.body, createWriteStream(`${dir}/${asset.id}.jpg`));

      index.photos.push({
        file,
        tags: ['смена', shiftId],
        caption: `Фото со Смены ${num}`,
        shift: shiftId,
      });
      added++;
    }
    console.log(`${album.albumName}: скопировано ${assets.length}, из них новых ${added}`);
  }

  writeFileSync(PHOTO_INDEX_PATH, JSON.stringify(index, null, 2) + '\n');
  console.log(`Итого добавлено ${added} фото с привязкой к смене в src/data/photo-index.json`);
}

main();
```

Примечание: `index.photos.push({..., file: 'smena-2/xxx.jpg'})` — `base` в `photo-index.json` остаётся `/images/gallery/`, а `/var/www/aidacamp-media/images/` уже смонтирован на dev и prod nginx как алиас `/images/` (см. `CLAUDE.md` → «Медиа и файлы — единое хранилище») — новых nginx-правок не требуется.

- [ ] **Шаг 2: Прогнать на сервере, проверить diff, скопировать обновлённый `photo-index.json` в репозиторий**

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /var/www/aidacamp/current && IMMICH_API_KEY=\$(grep '^IMMICH_API_KEY=' /opt/mcp/.env | cut -d= -f2-) node scripts/sync-immich-shift-photos.mjs"
scp -i ~/.ssh/aidacamp_prod root@159.194.223.55:/var/www/aidacamp/current/src/data/photo-index.json /tmp/photo-index-synced.json
diff src/data/photo-index.json /tmp/photo-index-synced.json   # проверить глазами
cp /tmp/photo-index-synced.json src/data/photo-index.json
```

(Скрипту нужен сам файл `scripts/sync-immich-shift-photos.mjs` на сервере — задеплоить его туда до запуска, как обычный код-деплой. Держать синк вне CI: новый альбом появляется вручную после каждой смены, запуск — по факту, не по расписанию.)

- [ ] **Шаг 3: Обновить `findPhotos()` — фильтр по смене, без выдумывания при отсутствии данных**

Сначала расширить интерфейс `Photo` в `src/lib/ai/photoSearch.ts` (сейчас `file/tags/caption`, строки 7-11):

```ts
interface Photo {
  file: string;
  tags: string[];
  caption: string;
  shift?: string; // ISO id смены ('shift-2'), если фото реально размечено — см. Task 5
}
```

Затем заменить сигнатуру `findPhotos`:

```ts
export function findPhotos(query: string, count = 4, shiftId?: string): PhotoResult[] {
  const q = query.toLowerCase();
  const base = photoIndex.base;
  const allPhotos = photoIndex.photos as Photo[];

  // Если просят конкретную смену и для неё ЕСТЬ размеченные фото — отдаём только их.
  if (shiftId) {
    const shiftPhotos = allPhotos.filter(p => p.shift === shiftId);
    if (shiftPhotos.length > 0) {
      return shiftPhotos.slice(0, count).map(p => ({ url: base + p.file, caption: p.caption }));
    }
    // Иначе — НЕ подменяем общими фото молча. Вызывающий код (ask.ts) должен был
    // уже честно предупредить в тексте (см. Task 4) — здесь просто падаем на общий поиск.
  }

  // ...остальная логика без изменений (общий поиск по тегам + fallback)...
}
```

- [ ] **Шаг 4: Тест на фикстуре с известной сменой**

Добавить в конец `src/lib/ai/photoSearch.ts` (или создать `src/lib/ai/photoSearch.test.ts`, если требуется мокать `photo-index.json` — смотреть по факту, есть ли уже фото со `shift` после шага 2; если разметки нет — тест на `shiftId`-ветку пишется с локальным моком, не трогая реальный `photo-index.json`):

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../data/photo-index.json', () => ({
  default: {
    base: '/images/gallery/',
    photos: [
      { file: 'a.avif', tags: ['еда'], caption: 'A', shift: 'shift-2' },
      { file: 'b.avif', tags: ['еда'], caption: 'B' },
    ],
  },
}));

import { findPhotos } from './photoSearch';

describe('findPhotos с shiftId', () => {
  it('возвращает только фото нужной смены, если они есть', () => {
    const r = findPhotos('еда', 4, 'shift-2');
    expect(r).toHaveLength(1);
    expect(r[0].caption).toBe('A');
  });

  it('падает на общий поиск, если для смены нет фото', () => {
    const r = findPhotos('еда', 4, 'shift-99');
    expect(r.length).toBeGreaterThan(0); // не пусто — общий поиск сработал
  });
});
```

Run: `npx vitest run src/lib/ai/photoSearch.test.ts`

- [ ] **Шаг 5: Прокинуть shiftId из ask.ts**

В `src/pages/api/ask.ts`, в блоке `if (responseData.block_type === 'gallery')` (строка ~352), передать `_lastShift?.id` когда вопрос был про последнюю смену — determine через тот же `intent`/regex, что уже различает фото-темы (photoTopicMap), либо проще: всегда передавать `_lastShift?.id` как последний аргумент — `findPhotos` использует его только если реально просили смену (LLM это отразит в `block_data.query`, например `"последняя смена"`):

```ts
if (responseData.block_type === 'gallery') {
  const photoQuery = (responseData.block_data as any)?.query || message;
  const wantsLastShift = /последн|прошл.*смен/i.test(message);
  responseData.block_data = { photos: findPhotos(photoQuery, 4, wantsLastShift ? _lastShift?.id : undefined) };
}
```

- [ ] **Шаг 6: Деплой на dev, прогон эвала, коммит**

```bash
./scripts/deploy-server.sh dev
BASE_URL=https://dev.aidacamp.ru npm run eval:ask
git add scripts/sync-immich-shift-photos.mjs src/data/photo-index.json src/lib/ai/photoSearch.ts src/lib/ai/photoSearch.test.ts src/pages/api/ask.ts
git commit -m "feat(ask-bot): фильтр фото по смене — источник Immich-альбомы (не Yandex Disk)"
```

---

### Task 6: Расширить golden-набор и закрепить регрессию

- [ ] **Шаг 1: Добавить в `scripts/eval-cases/golden.json` кейсы, найденные в Task 4-5**

```json
{
  "id": "shift-name-honesty",
  "question": "как прошла последняя смена, есть фото?",
  "graders": ["honest_about_shift_limits", "no_banned_words"]
}
```

- [ ] **Шаг 2: Полный прогон, сравнение с baseline из Task 1 Шаг 7**

```bash
BASE_URL=https://dev.aidacamp.ru npm run eval:ask
```
Expected: все кейсы OK. Сравнить `scripts/eval-reports/<новый>.json` с baseline-отчётом — убедиться, что ни один ранее проходивший кейс не сломался (side-by-side, [как рекомендует Anthropic](https://platform.claude.com/docs/en/docs/test-and-evaluate/eval-tool)).

- [ ] **Шаг 3: Задеплоить на prod (только после подтверждения владельца)**

```bash
MASTER_AGENT=1 ./scripts/deploy-server.sh prod
BASE_URL=https://aidacamp.ru npm run eval:ask
```

- [ ] **Шаг 4: Commit финального golden-набора**

```bash
git add scripts/eval-cases/golden.json
git commit -m "test: golden-кейсы для честности ответов про смены"
```

---

## Что осталось вне этого плана (осознанно)

- **Пересборка старого архива `photo_catalog.json` (9199 фото, Яндекс.Диск, годы 2020-2025) с привязкой к смене** — по-прежнему заблокирована мёртвым `YADISK_TOKEN`, но это уже не критично для основной задачи: Task 5 закрывает актуальную потребность («фото с последней смены») через Immich-альбомы, которые как раз содержат только свежие смены, а не старый архив. Токен нужен только если понадобятся исторические фото прошлых лет — см. `PHOTOS.md`.
- **Структурированные «результаты смены» (проекты детей, статистика хакатона)** — таких данных нет вообще ни в каком машиночитаемом виде (подтверждено аудитом). Прежде чем бот сможет отвечать на «какие были результаты у последней смены», кто-то должен начать эти данные собирать — это не инженерная задача, а процессная (кто и как фиксирует итоги смены). Не в рамках этого плана.
- **Метаданные `shift`/`date` в `knowledge_chunks` (RAG)** — та же проблема на уровне текстового RAG, не только фото: chunks не хранят дату/смену, поэтому RAG в принципе не может ответить «что говорили про последнюю смену» точнее общего сходства. По методологии Anthropic ([Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)) это отдельный, более крупный проект (миграция схемы таблицы + переиндексация всех источников) — заслуживает отдельного плана, если владелец подтвердит приоритет.
