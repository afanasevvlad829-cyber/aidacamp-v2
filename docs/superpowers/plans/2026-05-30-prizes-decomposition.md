# Prizes Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить `src/pages/portal/prizes.astro` (1346 строк) в тонкую страницу-композицию (~150 строк), вынеся чистую математику, API-клиент, Telegram-хелпер, клиентский скрипт, разметку-компоненты и общий CSS — с сохранением поведения байт-в-байт.

**Architecture:** Подход A — Astro-компоненты + vanilla-TS модули. Чистая доменная математика (`economyMath`) покрывается юнит-тестами ДО рефактора. Сеть (`portalApi`) и Telegram-UX (`tg`) выносятся в переиспользуемые модули — семя для остальных страниц. DOM-контракт (`data-*`/`id`) сохраняется как интерфейс между серверной разметкой и клиентским скриптом.

**Tech Stack:** Astro 6 (SSR, `prerender=false`), TypeScript, Tailwind v4, vitest, нативный `<dialog>`, Telegram WebApp SDK (опционально, с фолбэком).

**Spec:** `docs/superpowers/specs/2026-05-30-prizes-decomposition-design.md`

**Ветка:** `agent/refactor-prizes` (создать от чистого `dev`; НЕ коммитить в `agent/auto-penalties`). Деплой — только dev до явного «выкатываем».

---

## File Structure

| Файл | Ответственность |
|---|---|
| `src/lib/economyMath.ts` (NEW) | чистые функции экономики, без DOM/fetch |
| `src/lib/economyMath.test.ts` (NEW) | vitest, фиксирует поведение формул |
| `src/lib/portalApi.ts` (NEW) | `postJson`/`postForm` — единый клиент |
| `src/scripts/portal/tg.ts` (NEW) | Telegram WebApp обёртка с нативным фолбэком |
| `src/scripts/portal/prizes.ts` (NEW) | вся клиентская обвязка страницы |
| `src/components/portal/economy/*.astro` (NEW) | разметка (Settings, PrizesTable, диалоги, Activities, Summary) |
| `src/styles/portal-modal.css` (NEW) | общий `.aida-modal-center` |
| `src/pages/portal/prizes.astro` (MODIFY) | худеет до композиции + `<script src>` |

---

## Task 0: Safety net (baseline)

**Files:** none (verification only)

- [ ] **Step 1: Создать рабочую ветку от чистого dev**

```bash
git fetch origin
git stash list   # убедиться что нет своего стэша
# Дерево содержит чужие изменения auto-penalties — НЕ трогаем их.
# Создаём ветку от текущего origin/dev в чистом виде через worktree, чтобы не смешать:
git worktree add ../aidacamp-refactor-prizes -b agent/refactor-prizes origin/dev
cd ../aidacamp-refactor-prizes
```
Expected: новый worktree на ветке `agent/refactor-prizes`, дерево чистое (`git status` пусто).

- [ ] **Step 2: Базовый зелёный билд и тесты**

Run: `npm install && npm run build && npm test`
Expected: build PASS, vitest PASS. Зафиксировать как baseline. Если красно — остановиться, чинить не в рамках этого плана.

- [ ] **Step 3: Скриншоты «до» (dev)**

Развернуть текущую `prizes.astro` на dev (или локально `npm run preview`) и снять эталоны:
```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://dev.aidacamp.ru/portal/prizes' '/opt/browser-agent/output/prizes-before.png' --full"
```
Expected: PNG-эталон каждой вкладки (Призы/Активности/Сводка). Сохранить для `diff.js`.

---

## Task 1: `economyMath.ts` + тесты (TDD, чистое извлечение)

**Files:**
- Create: `src/lib/economyMath.ts`
- Test: `src/lib/economyMath.test.ts`

Извлечь формулы ДОСЛОВНО из `prizes.astro` (строки 768–805, 830–832, 1093–1145). Поведение
фиксируется тестами — НЕ «улучшать», даже если видны странности.

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/economyMath.test.ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ECONOMY_SETTINGS, roundTo, dailyPotential, recommendedBongere,
  saveDays, shiftFunds, activityRecommended, effectivePrice, perPerson, extractPct,
} from './economyMath';

const s = { ...DEFAULT_ECONOMY_SETTINGS }; // kids:35,days:10,phoneMin:10,markup:3,round:50,daily:600,targetExtract:75

describe('roundTo', () => {
  it('округляет к шагу', () => {
    expect(roundTo(123, 50)).toBe(100);
    expect(roundTo(125, 50)).toBe(150);
    expect(roundTo(0, 50)).toBe(0);
  });
});

describe('dailyPotential', () => {
  it('= daily', () => expect(dailyPotential(s)).toBe(600));
});

describe('recommendedBongere', () => {
  it('= roundTo(ozon*markup, round)', () => {
    expect(recommendedBongere(100, s)).toBe(300);     // 100*3=300 → 300
    expect(recommendedBongere(133, s)).toBe(400);     // 399 → 400
  });
});

describe('saveDays', () => {
  it('ceil(price/potential), 0 при невалидных', () => {
    expect(saveDays(1200, 600)).toBe(2);
    expect(saveDays(1300, 600)).toBe(3);              // ceil(2.16)
    expect(saveDays(0, 600)).toBe(0);
    expect(saveDays(500, 0)).toBe(0);
  });
});

describe('shiftFunds', () => {
  it('фонды смены', () => {
    const f = shiftFunds(s);
    expect(f.dp).toBe(600);
    expect(f.dailyFund).toBe(21000);                  // 35*600
    expect(f.total).toBe(210000);                     // 21000*10
    expect(f.targetExtract).toBe(157500);             // 210000*0.75
    expect(f.perKid).toBe(6000);                      // 600*10
    expect(f.phoneEquiv).toBe(60);                    // floor(600/10)
  });
});

describe('activityRecommended', () => {
  it('по формуле когда заданы targetDays и targetShare', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: 2, targetShare: 50, basePrice: null }, 50);
    expect(r.value).toBe(21000);                      // 35*600*2*0.5=21000
    expect(r.formula).toBe('35 × 600 × 2д × 50%');
  });
  it('фикс. цена когда формулы нет', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: null, targetShare: null, basePrice: 5000 }, 50);
    expect(r.value).toBe(5000);
    expect(r.formula).toBe('фикс.');
  });
  it('0 когда ничего не задано', () => {
    const r = activityRecommended({ participants: 35, dp: 600, targetDays: null, targetShare: null, basePrice: null }, 50);
    expect(r.value).toBe(0);
  });
});

describe('effectivePrice / perPerson / extractPct', () => {
  it('effectivePrice: custom при наличии, иначе recommended', () => {
    expect(effectivePrice(1500, 2000)).toBe(1500);
    expect(effectivePrice(null, 2000)).toBe(2000);
    expect(effectivePrice(NaN, 2000)).toBe(2000);
  });
  it('perPerson', () => {
    expect(perPerson(21000, 35, 50)).toBe(600);
    expect(perPerson(1000, 0, 50)).toBe(1000);
  });
  it('extractPct', () => {
    expect(extractPct(21000, 210000)).toBeCloseTo(10);
    expect(extractPct(1000, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- economyMath`
Expected: FAIL — `Cannot find module './economyMath'`.

- [ ] **Step 3: Реализовать модуль**

```ts
// src/lib/economyMath.ts
export interface EconomySettings {
  kids: number; days: number; phoneMin: number;
  markup: number; round: number; daily: number; targetExtract: number;
}

export const DEFAULT_ECONOMY_SETTINGS: EconomySettings = {
  kids: 35, days: 10, phoneMin: 10, markup: 3, round: 50, daily: 600, targetExtract: 75,
};

export const CAT_LABELS: Record<string, string> = {
  phone: 'Телефон', fun: 'Развлечения', food: 'Еда', prize: 'Физ. приз',
  privilege: 'Привилегии', comfort: 'Комфорт', service: 'Услуги', other: 'Прочее',
};

export function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export function dailyPotential(s: EconomySettings): number {
  return s.daily;
}

export function recommendedBongere(ozonPrice: number, s: EconomySettings): number {
  return roundTo(ozonPrice * s.markup, s.round);
}

export function saveDays(price: number, potential: number): number {
  if (!price || price <= 0 || potential <= 0) return 0;
  return Math.ceil(price / potential);
}

export interface ShiftFunds {
  dp: number; dailyFund: number; total: number;
  targetExtract: number; perKid: number; phoneEquiv: number;
}
export function shiftFunds(s: EconomySettings): ShiftFunds {
  const dp = dailyPotential(s);
  const dailyFund = s.kids * dp;
  const total = dailyFund * s.days;
  return {
    dp, dailyFund, total,
    targetExtract: total * (s.targetExtract / 100),
    perKid: dp * s.days,
    phoneEquiv: s.phoneMin > 0 ? Math.floor(dp / s.phoneMin) : 0,
  };
}

export interface ActivityInput {
  participants: number; dp: number;
  targetDays: number | null; targetShare: number | null; basePrice: number | null;
}
export function activityRecommended(a: ActivityInput, round: number): { value: number; formula: string } {
  if (a.targetDays && a.targetShare) {
    const raw = a.participants * a.dp * a.targetDays * (a.targetShare / 100);
    return { value: roundTo(raw, round), formula: `${a.participants} × ${a.dp} × ${a.targetDays}д × ${a.targetShare}%` };
  }
  if (a.basePrice != null && !Number.isNaN(a.basePrice)) {
    return { value: Number(a.basePrice), formula: 'фикс.' };
  }
  return { value: 0, formula: '—' };
}

export function effectivePrice(custom: number | null, recommended: number): number {
  return (custom != null && !Number.isNaN(custom)) ? custom : recommended;
}

export function perPerson(price: number, participants: number, round: number): number {
  return participants > 0 ? roundTo(price / participants, round) : price;
}

export function extractPct(price: number, totalShiftFund: number): number {
  return totalShiftFund > 0 ? (price / totalShiftFund) * 100 : 0;
}
```

- [ ] **Step 4: Запустить — убедиться, что зелено**

Run: `npm test -- economyMath`
Expected: PASS (все кейсы).

- [ ] **Step 5: Коммит**

```bash
git add src/lib/economyMath.ts src/lib/economyMath.test.ts
git commit -m "feat(portal): extract economyMath pure functions with tests"
```

---

## Task 2: `portalApi.ts`

**Files:**
- Create: `src/lib/portalApi.ts`
- Test: `src/lib/portalApi.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/portalApi.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { postJson, postForm } from './portalApi';

afterEach(() => vi.restoreAllMocks());

describe('postJson', () => {
  it('возвращает распарсенный ok-ответ', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: true, deleted: 3 }), { status: 200 })));
    const r = await postJson('/api/portal/x', { a: 1 });
    expect(r.ok).toBe(true);
    expect(r.deleted).toBe(3);
  });
  it('нормализует HTTP-ошибку в {ok:false,error}', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    const r = await postJson('/api/portal/x', {});
    expect(r.ok).toBe(false);
    expect(typeof r.error).toBe('string');
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npm test -- portalApi`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```ts
// src/lib/portalApi.ts
export interface ApiResult<T = any> { ok: boolean; error?: string; [k: string]: any }

async function parse<T>(r: Response): Promise<ApiResult<T>> {
  const body = await r.json().catch(() => ({} as any));
  if (!r.ok && body.ok == null) return { ...body, ok: false, error: body.error ?? `HTTP ${r.status}` };
  return body.ok != null ? body : { ...body, ok: r.ok };
}

export async function postJson<T = any>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return parse<T>(r);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network' };
  }
}

export async function postForm<T = any>(url: string, fd: FormData): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });
    return parse<T>(r);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network' };
  }
}
```

- [ ] **Step 4: Запустить — зелено**

Run: `npm test -- portalApi`
Expected: PASS.

- [ ] **Step 5: Коммит**

```bash
git add src/lib/portalApi.ts src/lib/portalApi.test.ts
git commit -m "feat(portal): add minimal portalApi client (postJson/postForm)"
```

---

## Task 3: `tg.ts` — Telegram WebApp хелпер

**Files:**
- Create: `src/scripts/portal/tg.ts`

Чистый клиентский модуль (DOM/Telegram). Юнит-тест не обязателен (зависит от глобала
Telegram); проверяется smoke-тестом в браузере и в Telegram.

- [ ] **Step 1: Реализовать**

```ts
// src/scripts/portal/tg.ts
type WebApp = any;
export const tg = (): WebApp | null => (globalThis as any)?.Telegram?.WebApp ?? null;

/** TG showConfirm, иначе нативный confirm. Всегда Promise<boolean>. */
export function confirmDialog(message: string): Promise<boolean> {
  const w = tg();
  if (w?.showConfirm) {
    return new Promise((resolve) => w.showConfirm(message, (ok: boolean) => resolve(!!ok)));
  }
  return Promise.resolve(window.confirm(message));
}

/** TG showAlert, иначе нативный alert. */
export function alertDialog(message: string): Promise<void> {
  const w = tg();
  if (w?.showAlert) {
    return new Promise((resolve) => w.showAlert(message, () => resolve()));
  }
  window.alert(message);
  return Promise.resolve();
}

/** Тактильный отклик; no-op вне Telegram. */
export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  if (type === 'success' || type === 'error') h.notificationOccurred(type);
  else h.impactOccurred(type);
}
```

- [ ] **Step 2: Проверка компиляции типов**

Run: `npx astro check 2>&1 | grep -i "scripts/portal/tg" || echo "no tg errors"`
Expected: `no tg errors` (или общий astro check без новых ошибок по tg.ts).

- [ ] **Step 3: Коммит**

```bash
git add src/scripts/portal/tg.ts
git commit -m "feat(portal): add Telegram WebApp helper with native fallback"
```

---

## Task 4: Подключить новые слои к существующему inline-скрипту

Цель — заменить дублирующую математику/fetch/confirm на новые модули, НЕ вынося ещё разметку.
Это изолирует регрессию: если что-то сломалось — виноваты слои, не перенос.

**Files:**
- Modify: `src/pages/portal/prizes.astro` (только `<script>`)

- [ ] **Step 1: Заменить `<script is:inline>` на модульный `<script>` с импортами**

В начале скрипта импортировать слои; удалить локальные дубли `roundTo`, `recommendedBongere`,
`saveDays`, `dailyPotential`, заменить расчёты на `economyMath.*`, `fetch(...)` на
`portalApi.postJson/postForm`, `confirm()/alert()` на `await confirmDialog()/alertDialog()`
(сделать обработчики `async`). Заменить тег:

```astro
<script>
  import { roundTo, recommendedBongere, saveDays, dailyPotential, shiftFunds,
           activityRecommended, effectivePrice, perPerson, extractPct,
           DEFAULT_ECONOMY_SETTINGS } from '../../lib/economyMath';
  import { postJson, postForm } from '../../lib/portalApi';
  import { confirmDialog, alertDialog, haptic } from '../../scripts/portal/tg';
  // ... тело: дубли формул удалены, вызовы переведены на импорты ...
</script>
```

Конкретные замены (по строкам исходника):
- 805 `roundTo` локальный → удалить, использовать импорт.
- 830–832 `recommendedBongere` → удалить, импорт.
- 801–804 `saveDays` → удалить, импорт.
- 800 `dailyPotential` → удалить, импорт.
- 879–887 ручной KPI-расчёт → `const f = shiftFunds(s);` и присвоение из `f`.
- 1107–1145 ручной расчёт активностей → `activityRecommended`, `effectivePrice`, `perPerson`, `extractPct`.
- Все `fetch('/api/portal/economy'...)` / `prize-ops` → `postJson`/`postForm`.
- `confirm(...)` (стр. 937,938,1007,1019,1040,1208,1329) → `await confirmDialog(...)`.
- `alert(...)` → `await alertDialog(...)`. Обработчики, где появился `await`, пометить `async`.
- На успешной «выдаче приза» и сохранении цены добавить `haptic('success')`.

- [ ] **Step 2: Билд**

Run: `npm run build`
Expected: PASS (нет ошибок импорта/типов).

- [ ] **Step 3: Smoke + визуальный diff**

Задеплоить на dev (`./scripts/deploy.sh dev`), снять скриншот, сравнить:
```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node screenshot.js 'https://dev.aidacamp.ru/portal/prizes' '/opt/browser-agent/output/prizes-after4.png' --full && node diff.js output/prizes-before.png output/prizes-after4.png output/diff4.png"
```
Expected: diff минимальный (только динамические числа). Прогнать ручной smoke §7 спеки: пересчёт KPI, ввод цены (debounce+save), выдача приза.

- [ ] **Step 4: Коммит**

```bash
git add src/pages/portal/prizes.astro
git commit -m "refactor(portal): wire economyMath/portalApi/tg into prizes script"
```

---

## Task 5: Вынести скрипт в `scripts/portal/prizes.ts`

**Files:**
- Create: `src/scripts/portal/prizes.ts`
- Modify: `src/pages/portal/prizes.astro`

- [ ] **Step 1: Перенести тело скрипта**

Скопировать всё тело `<script>` (из Task 4) в `src/scripts/portal/prizes.ts` как есть
(импорты сверху). В `prizes.astro` заменить блок на:

```astro
<script src="../../scripts/portal/prizes.ts"></script>
```
Astro забандлит модуль. Глобальные `id`/`data-*` в разметке не меняются.

- [ ] **Step 2: Билд**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Smoke + diff**

Деплой dev, скриншот `prizes-after5.png`, `diff.js` против `before`.
Expected: идентично Task 4. Проверить, что обработчики работают (порядок инициализации сохранён — `recalcPrizes()` в конце модуля).

- [ ] **Step 4: Коммит**

```bash
git add src/scripts/portal/prizes.ts src/pages/portal/prizes.astro
git commit -m "refactor(portal): move prizes inline script to scripts/portal/prizes.ts"
```

---

## Task 6: Разнести разметку по компонентам

Выносить ПО ОДНОМУ, после каждого — билд + diff. Компоненты — чистая разметка (props),
без `<script>`. Все `id`/`data-*` сохраняются дословно.

**Files (создаются по шагам):**
- `src/components/portal/economy/EconomySettings.astro`
- `src/components/portal/economy/PrizesTable.astro`
- `src/components/portal/economy/GivePrizeDialog.astro`
- `src/components/portal/economy/CustomPrizeDialog.astro`
- `src/components/portal/economy/ActivitiesTable.astro`
- `src/components/portal/economy/ActivityDialog.astro`
- `src/components/portal/economy/SummaryTab.astro`
- Modify: `src/pages/portal/prizes.astro`

- [ ] **Step 1: `EconomySettings.astro`** — перенести разметку строк 79–170 (панель параметров + KPI).
Компонент без props (статические инпуты/плейсхолдеры). В странице заменить блок на `<EconomySettings />`.
Run: `npm run build` → PASS. Deploy dev + diff. Commit `refactor(portal): extract EconomySettings component`.

- [ ] **Step 2: `PrizesTable.astro`** — перенести строки 219–364 (шапка каталога + таблица призов).
Props:
```ts
interface Props {
  prizes: any[];                 // ALL_PRIZES
  stateById: Map<string, any>;
  issuanceCounts: Record<string, number>;
  role: string;
  fmtRub: (n: number) => string;
}
```
Передавать из страницы: `<PrizesTable {prizes} {stateById} {issuanceCounts} {role} {fmtRub} />`.
Build → PASS. Deploy + diff. Commit `refactor(portal): extract PrizesTable component`.

- [ ] **Step 3: `GivePrizeDialog.astro`** — строки 366–432. Props: `kids: any[]`.
Build → PASS. diff. Commit `refactor(portal): extract GivePrizeDialog`.

- [ ] **Step 4: `CustomPrizeDialog.astro`** — строки 434–485. Без props.
Build → PASS. diff. Commit `refactor(portal): extract CustomPrizeDialog`.

- [ ] **Step 5: `ActivitiesTable.astro`** — строки 488–576. Props: `activities: any[]`, `CAT_LABELS`.
Build → PASS. diff (вкладка Активности). Commit `refactor(portal): extract ActivitiesTable`.

- [ ] **Step 6: `ActivityDialog.astro`** — строки 578–650. Без props.
Build → PASS. diff. Commit `refactor(portal): extract ActivityDialog`.

- [ ] **Step 7: `SummaryTab.astro`** — строки 653–679. Передать `fmtRub`, `totalAll`.
Build → PASS. diff (вкладка Сводка). Commit `refactor(portal): extract SummaryTab`.

После шага 7 `prizes.astro` = frontmatter + `<PortalLayout>` с табами-обёртками + 7 компонентов + `<style>` + `<script src>`.

---

## Task 7: Общий CSS модалок

**Files:**
- Create: `src/styles/portal-modal.css`
- Modify: `src/pages/portal/prizes.astro`

- [ ] **Step 1: Перенести `.aida-modal-center` блок**

Вырезать из `<style is:global>` (строки 716–749) правила `.aida-modal-center` и адаптив в
`src/styles/portal-modal.css`. Оставить в странице только специфичный `@media print` (683–715).
Подключить в frontmatter:
```astro
import '../../styles/portal-modal.css';
```

- [ ] **Step 2: Билд + diff**

Run: `npm run build` → PASS. Deploy dev, diff модалок (открыть give/custom/activity).
Expected: модалки центрируются как раньше, мобильный bottom-sheet работает.

- [ ] **Step 3: Коммит**

```bash
git add src/styles/portal-modal.css src/pages/portal/prizes.astro
git commit -m "refactor(portal): extract shared aida-modal-center to portal-modal.css"
```

---

## Task 8: Финальная верификация

**Files:** none

- [ ] **Step 1: Полный билд + тесты**

Run: `npm run build && npm test`
Expected: всё зелёное.

- [ ] **Step 2: Проверка размера страницы**

Run: `wc -l src/pages/portal/prizes.astro`
Expected: ≤ ~150 строк.

- [ ] **Step 3: Полный ручной smoke (§7 спеки) на dev + в Telegram**

Пройти весь чек-лист §7: KPI, пересчёт, ввод/сброс цены, скрыть/показать, наценка, выдача приза
(с файлом), кастомный приз (создать/удалить), активность (CRUD + цена вручную), печать призов и
активностей, (admin) сброс выдач, табы, модалки на мобиле. Дополнительно: открыть в Telegram
Mini App — confirm/alert показываются нативно, haptic срабатывает.
Expected: всё работает идентично «до».

- [ ] **Step 4: Финальный diff**

`diff.js` `prizes-before.png` против финального скриншота каждой вкладки.
Expected: расхождения только в динамических числах.

- [ ] **Step 5: PR в dev**

```bash
git push origin agent/refactor-prizes
gh pr create --base dev --title "refactor(portal): decompose prizes.astro (pilot)" \
  --body "Пилот декомпозиции. 1346→~150 стр. Новые слои: economyMath(+тесты), portalApi, tg. Поведение сохранено (diff+smoke). Спека: docs/superpowers/specs/2026-05-30-prizes-decomposition-design.md"
```
Сообщить мастер-агенту — НЕ мёрджить самому.

---

## Self-Review

- **Spec coverage:** §3 структура → Tasks 1–7; §4.1 economyMath → Task 1; §4.2 portalApi → Task 2;
  §4.4-bis tg.ts → Task 3; §4.3 компоненты → Task 6; §4.5 portal-modal.css → Task 7;
  §5 этапность → Tasks 1–7 по порядку; §6 сеть безопасности → Task 0; §7 smoke → Task 8 Step 3.
  Все разделы покрыты.
- **Placeholders:** код приведён в Tasks 1–3 полностью; в Task 6 разметка переносится по точным
  строкам исходника (повторять 600 строк верстки в плане нецелесообразно — указаны диапазоны и
  props-контракты).
- **Type consistency:** `EconomySettings`, `shiftFunds`, `activityRecommended`, `effectivePrice`,
  `perPerson`, `extractPct`, `postJson/postForm`, `confirmDialog/alertDialog/haptic` — имена
  совпадают между спекой, Task 1–4 и местами использования.
