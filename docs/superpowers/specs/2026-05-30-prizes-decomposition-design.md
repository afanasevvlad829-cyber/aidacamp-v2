# Декомпозиция `portal/prizes.astro` — дизайн (пилот рефакторинга портала)

**Дата:** 2026-05-30
**Статус:** утверждён владельцем (Подход A, полная декомпозиция, этапы 1–5)
**Контекст:** пилот в рамках большого рефакторинга портала сотрудников. Цель пилота —
получить переиспользуемый шаблон декомпозиции монолитных `.astro`-страниц и
переиспользуемые слои (`economyMath`, `portalApi`, общие компоненты, общий CSS модалок),
которые затем применяются к `rooms.astro`, `smena.astro`, `plan.astro`.

Связанные документы: отчёт-аудит → https://dev.aidacamp.ru/reports-hub/#2026-05-30-portal-audit

---

## 1. Цель и критерии успеха

Превратить `src/pages/portal/prizes.astro` (1346 строк, ~590 строк `<script is:inline>`,
~625 строк разметки) в тонкую страницу-композицию (~120 строк), вынеся:

- чистую экономическую математику в тестируемый модуль;
- сетевые вызовы в минимальный API-клиент;
- клиентскую обвязку во внешний TS-модуль;
- разметку в Astro-компоненты;
- дублирующийся CSS модалок в общий файл.

**Критерии успеха (проверяемые):**

1. `npm run build` проходит зелёным (включая guard, icons, banned-words).
2. `npm test` (vitest) зелёный; новый `economyMath.test.ts` покрывает все формулы.
3. Поведение страницы идентично: визуальный diff «до/после» ключевых вкладок ≤ порога;
   ручной smoke-тест проходит (см. §7).
4. `prizes.astro` ≤ ~150 строк; ни один новый файл не содержит `is:inline`-логики
   крупнее обвязки композиции.
5. Никаких изменений в API-роутах (`/api/portal/economy`, `/api/portal/prize-ops`) —
   контракт запрос/ответ сохраняется байт-в-байт.
6. Список доступных bi-иконок не нарушен (все иконки из `icons-manifest.json`).

**Вне области (YAGNI):**

- Не меняем серверные lib-модули (`portalEconomy`, `portalPrizeOps`, `portalPrizes`) кроме
  возможного переноса `ALL_PRIZES`-merge и `CAT_LABELS` (см. §4.1).
- Не вводим фреймворк-острова (Preact/React) — отклонено как Подход B.
- Не трогаем другие страницы портала в этом пилоте (но создаём слои так, чтобы они
  переиспользовались).

---

## 2. Текущая структура (факты)

| Блок | Строки | Содержимое |
|---|---|---|
| Frontmatter | 1–53 | `prerender=false`; гейт роли admin/rukovoditel; `Promise.all` 5 источников; merge `ALL_PRIZES` (hardcoded `PRIZES` + кастомные); `totalAll`; `fmtRub`; `CAT_LABELS` |
| Разметка | 54–679 | заголовок+философия; панель «Параметры смены» + 5 KPI; табы (Призы/Активности/Сводка); таблица призов; модалки `give-dialog`, `custom-dialog`; таблица активностей; модалка `activity-dialog`; сводка |
| `<style is:global>` | 681–750 | `@media print` (печать вкладки); `.aida-modal-center` + адаптив (дублируется на других страницах портала) |
| `<script is:inline>` | 751–1344 | bindFileLabel; localStorage settings (`LS_SETTINGS`, `LS_KEY`); `fmt`; формулы `recommendedBongere/saveDays/roundTo/dailyPotential`; `recalcPrizes/recalcKPIOnly/recalcActivities`; табы; обвязка строк призов (debounced save, reset, hide); apply-markup; import-localstorage; обвязка активностей (save/reset/upsert/delete + dialog); модалка выдачи; модалка кастома; печать; archive-custom; первый рендер |

**Внешние контракты, которые ДОЛЖНЫ сохраниться:**

- `POST /api/portal/economy` — actions: `set_prize` (`{prize_id, bongere_price?, hidden?, custom_photo?}`),
  `import_localstorage` (`{deleted[], bongere{}, photos{}}`), `upsert_activity`, `delete_activity`,
  `set_activity_custom_price` (`{id, custom_price}`).
- `POST /api/portal/prize-ops` — actions: `issue` (FormData), `create_custom` (FormData),
  `archive_custom` (JSON), `reset_all_issuances` (JSON, только admin).
- DOM-контракт: `data-*`-атрибуты строк (`data-prize-row/-id/-price/-qty/-remaining/-hidden/-bongere`,
  `data-activity-row/...`) — это интерфейс между серверной разметкой и клиентским скриптом;
  при выносе скрипта он сохраняется как есть.

---

## 3. Целевая архитектура

```
src/lib/
  economyMath.ts          NEW  — чистые функции, без DOM/fetch
  economyMath.test.ts     NEW  — vitest, фиксирует текущее поведение формул
  portalApi.ts            NEW  — минимальный клиент: postJson(), postForm()

src/scripts/portal/
  tg.ts                   NEW  — обёртка Telegram WebApp с фолбэком на нативное:
                                 confirm()/alert() → showConfirm/showAlert,
                                 haptic(), mainButton() — no-op вне Telegram

src/components/portal/economy/
  EconomySettings.astro   панель «Параметры смены» + KPI-карточки (разметка)
  PrizesTable.astro       каталог призов (таблица + строки)
  GivePrizeDialog.astro   модалка «Выдать приз»
  CustomPrizeDialog.astro модалка «Новый приз»
  ActivitiesTable.astro   таблица активностей
  ActivityDialog.astro    модалка активности
  SummaryTab.astro        сводка

src/scripts/portal/
  prizes.ts               NEW — вся клиентская обвязка; import economyMath, portalApi

src/styles/
  portal-modal.css        NEW — общий .aida-modal-center (+ перевод др. страниц позже)

src/pages/portal/prizes.astro   худеет до ~120–150 строк:
  frontmatter (load) → <PortalLayout> → <EconomySettings/> + табы с компонентами
  → <script src="../../scripts/portal/prizes.ts">
```

### Принцип границ

- `economyMath.ts` — **не знает про DOM и сеть**. Вход — числа/настройки, выход — числа/строки.
  Это позволяет переиспользовать те же формулы в `/staff/` и в будущих отчётах.
- `portalApi.ts` — **не знает про конкретные endpoint'ы домена**; даёт `postJson(url, body)` и
  `postForm(url, formData)` с единой обработкой `{ok,error}`/HTTP-ошибок. Семя Фазы 2.
- `prizes.ts` — **единственное место с DOM + бизнес-обвязкой**; импортирует чистые слои.
- `*.astro`-компоненты — **только разметка** (принимают данные пропсами), без `<script>`.

---

## 4. Детализация модулей

### 4.1 `economyMath.ts` (чистые функции)

Извлекаются как есть (поведение фиксируется тестами ДО любого рефактора разметки):

```ts
export interface EconomySettings {
  kids: number; days: number; phoneMin: number;
  markup: number; round: number; daily: number; targetExtract: number;
}
export function roundTo(n: number, step: number): number;
export function dailyPotential(s: EconomySettings): number;        // = s.daily
export function recommendedBongere(ozonPrice: number, s: EconomySettings): number; // roundTo(ozon*markup, round)
export function saveDays(price: number, potential: number): number; // ceil(price/potential), 0 при невалидных
// Активности:
export function activityRecommended(p: {participants:number; dp:number; targetDays:number|null; targetShare:number|null; basePrice:number|null}, round:number): {value:number; formula:string};
export function effectivePrice(custom: number|null, recommended: number): number;
export function perPerson(price:number, participants:number, round:number): number;
export function extractPct(price:number, totalShiftFund:number): number;
// KPI:
export function shiftFunds(s: EconomySettings): {dp:number; dailyFund:number; total:number; targetExtract:number; perKid:number; phoneEquiv:number};
```

Дефолты настроек (`kids:35, days:10, phoneMin:10, markup:3, round:50, daily:600, targetExtract:75`)
выносятся в `DEFAULT_ECONOMY_SETTINGS`.

`CAT_LABELS` (категории активностей) — переносится сюда же как экспортируемая константа
(используется и в разметке, и потенциально в скрипте).

### 4.2 `portalApi.ts` (минимальный клиент)

```ts
export interface ApiResult<T=any> { ok: boolean; error?: string; [k:string]: any }
export async function postJson<T=any>(url: string, body: unknown): Promise<ApiResult<T>>;
export async function postForm<T=any>(url: string, fd: FormData): Promise<ApiResult<T>>;
// Оба: credentials:'include'; парсят JSON с .catch(()=>({})); нормализуют HTTP!=2xx в {ok:false,error}.
```

Заменяет ~12 ручных `fetch` в скрипте. Сохраняет текущую семантику (часть вызовов
сейчас не шлёт `credentials` — приводим к единому `include`, что безопасно: те же cookie).

### 4.3 Компоненты `.astro`

Принимают уже загруженные данные пропсами из frontmatter страницы:

- `EconomySettings.astro` — статическая разметка инпутов и KPI-плейсхолдеров (id сохраняются:
  `set-*`, `kpi-*`). Без логики.
- `PrizesTable.astro` — props: `prizes: AllPrize[]`, `stateById`, `issuanceCounts`, `role`, `fmtRub`.
  Сохраняет все `data-*` и `id`. Рендерит строки циклом (как сейчас).
- `GivePrizeDialog.astro` / `CustomPrizeDialog.astro` / `ActivityDialog.astro` — разметка модалок,
  id сохраняются.
- `ActivitiesTable.astro` — props: `activities`, `CAT_LABELS`.
- `SummaryTab.astro` — статические плейсхолдеры (`sum-*`).

Тип `AllPrize` и merge `ALL_PRIZES` — выносятся в `economyMath.ts` или соседний
`portalPrizes`-хелпер, чтобы страница осталась тонкой (решение на этапе реализации,
по умолчанию — оставить merge во frontmatter страницы, перенести только тип).

### 4.4 `scripts/portal/prizes.ts`

Вся обвязка из текущего `<script is:inline>`, дословно по поведению, но:
- формулы → вызовы `economyMath`;
- `fetch` → `portalApi`;
- обёрнута в IIFE/модуль; подключается `<script src=...>` (Astro забандлит).

### 4.4-bis `scripts/portal/tg.ts` (Telegram WebApp-хелпер)

Тонкая обёртка над `window.Telegram?.WebApp` с безопасным фолбэком вне Telegram
(портал открывается и в обычном браузере, и в Telegram Mini App):

```ts
export const tg = () => (globalThis as any).Telegram?.WebApp ?? null;
export async function confirmDialog(msg: string): Promise<boolean>; // TG showConfirm | native confirm()
export async function alertDialog(msg: string): Promise<void>;      // TG showAlert  | native alert()
export function haptic(type?: 'light'|'medium'|'heavy'|'success'|'error'): void; // no-op вне TG
export function mainButton(text: string, onClick: () => void): { hide(): void } | null;
```

В пилоте prizes: ~8 `confirm()` и многочисленные `alert()` маршрутизируются через
`confirmDialog`/`alertDialog`. Тактильный отклик (`haptic`) — на «выдать приз», сохранение цены,
скрытие позиции. `mainButton` — опционально для модалок выдачи (отдельным мелким шагом, можно
отложить). Это семя Trek B/C: один источник истины для TG-UX.

**Важно:** контракт сохранения поведения — вне Telegram `confirmDialog`/`alertDialog` ведут себя
ровно как нативные `confirm`/`alert` (синхронная семантика заворачивается в Promise; все вызовы
становятся `await`). Никаких изменений логики, только канал отображения.

### 4.5 `styles/portal-modal.css`

`.aida-modal-center` + адаптив + общая часть `@media print` модалок. Подключается на странице.
Перевод остальных страниц на этот файл — вне пилота (отдельная задача), но файл создаётся так,
чтобы они могли импортировать его позже.

---

## 5. Этапность (каждый шаг компилируется и проверяем)

1. **economyMath + тесты** — извлечь формулы, написать `economyMath.test.ts`, `npm test` зелёный.
   UI ещё использует старый inline-код. Риск 0.
2. **portalApi + tg.ts** — создать клиент и Telegram-хелпер; заменить fetch на `portalApi`,
   `confirm()/alert()` на `confirmDialog/alertDialog` в текущем inline-скрипте. Build+smoke
   (проверить и в браузере, и в Telegram-вьюпорте).
3. **Вынести скрипт** — переместить inline → `scripts/portal/prizes.ts` (через `<script src>`),
   подключить economyMath/portalApi/tg. Build + визуальный diff + smoke.
4. **Разнести разметку** по компонентам по одному (Settings → Prizes → диалоги → Activities →
   Summary), после каждого — build + diff.
5. **Общий CSS модалок** — вынести `.aida-modal-center` в `portal-modal.css`, подключить на странице.

Каждый этап — отдельный коммит; при регрессии откатывается независимо.

---

## 6. Сеть безопасности (до правок)

1. `economyMath.test.ts` фиксирует формулы (поведение «как есть», даже если есть мелкие
   странности — сохраняем, не «чиним» в рамках пилота → отдельные заметки).
2. Скриншоты «до» (browser-agent, dev): вкладки Призы / Активности / Сводка + открытые модалки.
3. После каждого этапа: `npm run build`, `npm test`, скриншот + `diff.js`.

## 7. Ручной smoke-тест (после финала)

- [ ] Изменить «Детей/Дней/Наценку» → KPI пересчитываются; кнопка «Пересчитать» подсвечивается.
- [ ] «Пересчитать цены» → колонки «Рекоменд.»/«Копить» обновляются.
- [ ] Ввести цену в «Цена, игр. ₽» → debounced save, галочка, без перезагрузки.
- [ ] «Сбросить к рекомендованной» → поле пустеет, сохраняется null.
- [ ] Скрыть/показать позицию; «Показать скрытые».
- [ ] «Применить наценку ко всем».
- [ ] Выдать приз (выбор ребёнка + файл) → reload, счётчик «Выдано» растёт.
- [ ] Добавить кастомный приз; удалить его.
- [ ] Добавить/изменить/удалить активность; «Цена вручную» сохраняется.
- [ ] Печать призов и активностей (только активная вкладка).
- [ ] (admin) «Сбросить все выдачи».
- [ ] Табы переключаются; модалки центрируются и на мобиле.

---

## 8. Риски

| Риск | Митигация |
|---|---|
| Расхождение поведения формул при извлечении | тесты пишутся ДО, по текущему коду |
| Потеря `data-*`/`id`-контракта между разметкой и скриптом | контракт зафиксирован в §2; diff после каждого этапа |
| Astro `<script src>` иначе бандлит, чем `is:inline` (порядок/scope) | проверка в этапе 3 отдельно; глобальные id остаются глобальными |
| Изменение `credentials` на части вызовов | те же cookie, домен тот же — безопасно; покрыто smoke |
| Страница SSR (`prerender=false`), деплой только dev | сначала dev, прод — по явному «выкатываем» |
