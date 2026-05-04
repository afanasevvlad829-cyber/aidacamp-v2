# SEO Top-5 Подмосковье — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Поднять 4 ключевых запроса в топ-5 Яндекса: "летний лагерь для детей" (→14), "лагерь в подмосковье" (→19), "детский лагерь в подмосковье" (→19), "летний лагерь в подмосковье" (→11).

**Architecture:** Три рычага — (1) исправить keyword mismatch в h1/title целевых страниц, (2) усилить внутреннюю перелинковку с правильными anchor-текстами, (3) добавить контентный объём на слабые страницы. Всё в рамках существующего Astro SSR проекта.

**Tech Stack:** Astro 6.x, Tailwind CSS v4, TypeScript, ветка `agent/seo-block1-technical`

---

## Диагностика (что сломано сейчас)

| Запрос | Позиция | Целевая страница | Проблема |
|---|---|---|---|
| летний лагерь для детей | 14 | `/` (homepage) | title = "Детский лагерь", нет "летний лагерь для детей" в h1 |
| летний лагерь в подмосковье | 11 | `/lager-v-podmoskove` | h1 без года, мало контента под запрос |
| лагерь в подмосковье | 19 | `/lager-v-podmoskove` | та же страница, конкурирует сама с собой с homepage |
| детский лагерь в подмосковье | 19 | `/detskiy-lager-podmoskove` | h1 = "в Московской области" — ключевое слово отсутствует! |

---

## File Map

| Файл | Задача |
|---|---|
| `src/pages/detskiy-lager-podmoskove.astro` | Task 1: исправить h1/title/description |
| `src/pages/lager-v-podmoskove.astro` | Task 2: добавить год + секцию под "лагерь в подмосковье" |
| `src/components/SeoTextBlock.astro` | Task 3: добавить ссылку на detskiy-lager-podmoskove |
| `src/pages/index.astro` | Task 4: добавить "летний лагерь для детей" в контент |
| `src/data/landing-pages.ts` | Task 5: обновить anchor-тексты в RelatedPages |

---

## Task 1: Исправить keyword mismatch на /detskiy-lager-podmoskove

**Проблема:** h1 = "Детский лагерь в **Московской области**" — Яндекс не видит "в Подмосковье" в главном теге.

**Files:**
- Modify: `src/pages/detskiy-lager-podmoskove.astro`

- [ ] **Step 1: Проверить текущий h1**

```bash
grep -E 'h1=|title=' src/pages/detskiy-lager-podmoskove.astro
```

Ожидаемый вывод:
```
title="Детский лагерь в Подмосковье 2026 — летний, от 48 000 ₽ | АйДаКемп"
h1="Детский лагерь в Московской области — АйДаКемп"
```

- [ ] **Step 2: Исправить h1 в LandingLayout props**

В файле найти строки с `h1=` и заменить:

```astro
<!-- БЫЛО -->
h1="Детский лагерь в Московской области — АйДаКемп"

<!-- СТАЛО -->
h1="Детский лагерь в Подмосковье 2026"
```

Найти обе строки (в LandingLayout и LandingHero):
```bash
grep -n 'Московской области' src/pages/detskiy-lager-podmoskove.astro
```
Заменить все вхождения "Детский лагерь в Московской области — АйДаКемп" на "Детский лагерь в Подмосковье 2026".

- [ ] **Step 3: Исправить первый H2 на странице**

Найти первый `h2:` в массиве `sections`:
```bash
grep -n 'h2:' src/pages/detskiy-lager-podmoskove.astro | head -3
```

Если первый h2 содержит "Московской области" — заменить на "Подмосковье".

- [ ] **Step 4: Проверить результат**

```bash
grep -E 'h1=|Московской области' src/pages/detskiy-lager-podmoskove.astro
```

Ожидаемый вывод: строк с "Московской области" нет.

- [ ] **Step 5: Сборка и проверка**

```bash
npm run build 2>&1 | tail -5
```

Ожидаемый вывод: `Finished in X seconds` без ошибок.

- [ ] **Step 6: Коммит**

```bash
git add src/pages/detskiy-lager-podmoskove.astro
git commit -m "seo: fix h1 keyword mismatch on detskiy-lager-podmoskove (Подмосковье not Московская обл)"
```

---

## Task 2: Усилить /lager-v-podmoskove под оба запроса

**Проблема:** "лагерь в подмосковье" (без "летний") на позиции 19, хотя страница есть. h1 содержит "Летний", но нет самостоятельного H2 под "лагерь в подмосковье". Добавить год в h1.

**Files:**
- Modify: `src/pages/lager-v-podmoskove.astro`

- [ ] **Step 1: Добавить "2026" в h1**

Найти:
```bash
grep -n 'h1=' src/pages/lager-v-podmoskove.astro
```

Заменить (обе строки — в LandingLayout и LandingHero):
```astro
<!-- БЫЛО -->
h1="Летний лагерь в Подмосковье для детей"

<!-- СТАЛО -->
h1="Летний лагерь в Подмосковье 2026 для детей"
```

- [ ] **Step 2: Добавить H2 секцию под запрос "лагерь в подмосковье"**

В массиве `sections` добавить новую секцию после первой (про расположение):

```typescript
{
  h2: "Какой лагерь в Подмосковье выбрать в 2026 году?",
  text: "В Подмосковье десятки лагерей — спортивные, языковые, тематические. АйДаКемп занимает нишу IT-образования с реальным результатом: ребёнок уезжает с собственным проектом на Python или AI. Это не кружок — полноценная учебная программа в формате лагеря с бассейном, питанием и проживанием.",
  list: [
    "Расположение: Наро-Фоминский р-н, 66 км по Киевскому шоссе",
    "Возраст: 7–15 лет, группы по возрасту",
    "Программа: Python, AI, Minecraft, 3D-моделирование — по выбору",
    "Питание 5 раз в день, медработник 24/7, видеонаблюдение",
    "Лицензия Минобрнауки — налоговый вычет 13% (до 5 434 ₽)"
  ]
},
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build 2>&1 | tail -5
```

- [ ] **Step 4: Коммит**

```bash
git add src/pages/lager-v-podmoskove.astro
git commit -m "seo: add 2026 to h1 + new H2 section on lager-v-podmoskove"
```

---

## Task 3: Увеличить внутреннюю перелинковку на /detskiy-lager-podmoskove

**Проблема:** `/detskiy-lager-podmoskove` получает ссылки только с 11 страниц vs 42 у `/lager-v-podmoskove`. Нужно добавить ссылки с правильным anchor-текстом.

**Files:**
- Modify: `src/components/SeoTextBlock.astro`
- Modify: `src/data/landing-pages.ts`

- [ ] **Step 1: Проверить текущий SeoTextBlock**

```bash
cat src/components/SeoTextBlock.astro
```

Найти ссылку на `/lager-v-podmoskove` и добавить рядом ссылку на `/detskiy-lager-podmoskove`.

- [ ] **Step 2: Добавить ссылку в SeoTextBlock**

Найти строку с `/lager-v-podmoskove` и добавить после неё:

```astro
<!-- Добавить рядом с существующей ссылкой -->
<a href="/detskiy-lager-podmoskove" class="text-orange-600 hover:underline">Детский лагерь в Подмосковье →</a>
```

Точный контекст вставки — найти через:
```bash
grep -n 'lager-v-podmoskove' src/components/SeoTextBlock.astro
```

- [ ] **Step 3: Обновить anchor-текст в landing-pages.ts**

```bash
grep -n 'detskiy-lager-podmoskove\|lager-v-podmoskove' src/data/landing-pages.ts
```

Убедиться что title ссылок содержит точные ключевые слова:

```typescript
// Найти и проверить/исправить:
{ title: 'Детский лагерь в Подмосковье', url: '/detskiy-lager-podmoskove', ... },
{ title: 'Летний лагерь в Подмосковье', url: '/lager-v-podmoskove', ... },
// Если title другой — привести к точному вхождению ключевого слова
```

- [ ] **Step 4: Сборка и коммит**

```bash
npm run build 2>&1 | tail -5
git add src/components/SeoTextBlock.astro src/data/landing-pages.ts
git commit -m "seo: boost internal links to detskiy-lager-podmoskove with exact anchor text"
```

---

## Task 4: Добавить "летний лагерь для детей" на homepage

**Проблема:** Homepage ранжируется по "летний лагерь для детей" на позиции 14, но в title стоит "Детский лагерь" — нет прямого вхождения ключа.

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Проверить текущий title и h1 homepage**

```bash
grep -E 'title=|h1|<h1' src/pages/index.astro | head -10
```

- [ ] **Step 2: Найти секцию с текстом где можно добавить ключ**

```bash
grep -n 'летний лагерь для детей\|летний лагерь\|лагерь для детей' src/pages/index.astro | head -10
```

- [ ] **Step 3: Добавить ключевую фразу в видимый текст на странице**

Найти подходящий параграф или subtitle и добавить естественное вхождение:

```astro
<!-- Пример — в subtitle Hero или в первый параграф About: -->
<!-- БЫЛО: -->
"IT-лагерь в Подмосковье для детей 7–15 лет"

<!-- СТАЛО: -->
"Летний лагерь для детей 7–15 лет — IT-программа в Подмосковье"
```

Точное место — определить по выводу Step 2. Изменение должно быть органичным, не спамом.

- [ ] **Step 4: Добавить внутреннюю ссылку на /lager-v-podmoskove с правильным anchor**

Найти место где homepage ссылается на условия/смены и добавить:

```astro
<a href="/lager-v-podmoskove">летний лагерь в Подмосковье</a>
```

```bash
grep -n 'lager-v-podmoskove\|летний лагерь' src/pages/index.astro | head -10
```

- [ ] **Step 5: Сборка и коммит**

```bash
npm run build 2>&1 | tail -5
git add src/pages/index.astro
git commit -m "seo: add 'летний лагерь для детей' keyword to homepage content"
```

---

## Task 5: Deploy и верификация

- [ ] **Step 1: Deploy на dev**

```bash
./scripts/deploy.sh dev 2>&1 | tail -8
```

Ожидаемый вывод: `✅ Задеплоено на DEV (dev.aidacamp.ru)`

- [ ] **Step 2: Проверить страницы в браузере**

Открыть и проверить h1 на каждой странице:
- `https://dev.aidacamp.ru/detskiy-lager-podmoskove` → h1 должен содержать "в Подмосковье 2026"
- `https://dev.aidacamp.ru/lager-v-podmoskove` → h1 должен содержать "2026"
- `https://dev.aidacamp.ru/` → текст должен содержать "летний лагерь для детей"

```bash
# Автопроверка через сервер:
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 \
  "cd /opt/browser-agent && node scrape.js 'https://dev.aidacamp.ru/detskiy-lager-podmoskove' text" \
  | grep -i "h1\|подмосковье"
```

- [ ] **Step 3: Создать PR**

```bash
git push origin agent/seo-block1-technical
gh pr create --base dev \
  --title "seo: топ-5 по 4 ключам Подмосковье — fix h1, internal links, content" \
  --body "## Что сделано
- Task 1: h1 /detskiy-lager-podmoskove — убрали 'Московской области', добавили 'Подмосковье 2026'
- Task 2: h1 /lager-v-podmoskove + новая H2-секция под 'лагерь в подмосковье'
- Task 3: +ссылки на detskiy-lager-podmoskove в SeoTextBlock + anchor-тексты
- Task 4: 'летний лагерь для детей' в homepage контент

## Целевые позиции
| Запрос | Было | Цель |
|---|---|---|
| летний лагерь для детей | 14 | ≤5 |
| лагерь в подмосковье | 19 | ≤10 |
| детский лагерь в подмосковье | 19 | ≤10 |
| летний лагерь в подмосковье | 11 | ≤5 |"
```

---

## Self-Review

**Spec coverage:**
- ✅ "летний лагерь для детей" → Task 4 (homepage контент)
- ✅ "лагерь в подмосковье" → Task 2 (новый H2 + год в h1)
- ✅ "детский лагерь в подмосковье" → Task 1 (h1 keyword fix)
- ✅ "летний лагерь в подмосковье" → Task 2 (год в h1)
- ✅ Внутренняя перелинковка → Task 3

**Ожидаемый эффект и сроки:** Яндекс переиндексирует страницы за 3–14 дней. Позиции проверять через снимок в `seo_position_snapshots` через неделю.
