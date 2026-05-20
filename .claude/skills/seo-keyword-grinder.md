---
name: seo-keyword-grinder
description: >
  Полный SEO-грайндер для aidacamp.ru. Покрывает весь цикл: аудит кластеров → on-page оптимизация
  → создание страниц → деплой → дашборд. Использовать через /loop для автономного прохода всех кластеров.
  Содержит накопленный опыт: типичные ошибки, паттерны Astro, FAQ schema, запрещённые слова.
---

# SEO Keyword Grinder — AidaCamp

Ты — SEO-агент АйДаКемп. Методично проходишь кластеры из `seo_cluster_progress`, пока все не `done`.

## Инфраструктура

- **Репо:** `~/Aidacamp-cloude`, ветка `dev`
- **Сервер:** `mcp__aidacamp-tools__ssh` (host: `aidacamp`)
- **БД:** `postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp`
- **Деплой dev:** `SKIP_GIT_GUARD=1 ./scripts/deploy.sh dev`
- **Деплой пуш:** `env MASTER_AGENT=1 git -C ~/Aidacamp-cloude push origin dev`
- **Дашборд:** `node /opt/seo-dashboard/build.js` (на сервере)
- **Коммит:** `MASTER_AGENT=1 git add ... && MASTER_AGENT=1 git commit -m "perf(seo): ..."`

---

## Алгоритм итерации

### Шаг 1 — взять следующий кластер
```sql
SELECT cluster, label, action_type, target_url, kw_count, total_vol, avg_pos, not_indexed
FROM seo_cluster_progress WHERE status='todo' ORDER BY priority LIMIT 1;
```
Нет todo → вывести финальный отчёт, остановиться.

### Шаг 2 — собрать данные по кластеру
```sql
-- Топ ключей кластера (вместо %паттерн% подставить нужный)
SELECT keyword, MIN(position) as best_pos, MAX(volume) as vol
FROM seo_positions
WHERE keyword ILIKE '%ключевое_слово%' AND volume > 0
GROUP BY keyword ORDER BY vol DESC LIMIT 15;
```

Параллельно прочитать целевую страницу из репо.

### Шаг 3 — отметить in_progress
```sql
UPDATE seo_cluster_progress SET status='in_progress', started_at=NOW() WHERE cluster='<cluster>';
```

### Шаг 4 — выполнить действие

#### `optimize` — страница есть, позиция 6–20
Чек-лист на файле (в LandingLayout):
1. `title` — ≤60 символов, главный ключ в начале, есть "2026" если сезонная
2. `description` — ≤140 символов, CTR-ориентированный, ключ + конкретика (цена/км/дней)
3. `h1` в LandingLayout — главный ключ + "2026"
4. `h1` в LandingHero — другая формулировка (для разнообразия сигналов)
5. `subtitle` в LandingHero — конкретика (расстояние, цена, трансфер)
6. FAQ Schema — ≥1 вопрос с "2026" и конкретным ответом
7. Если секций <4 — добавить 1–2 новых section с ключами кластера

#### `create_page` — страница не существует
1. Найти похожую страницу-шаблон (напр. `lager-dlya-devochek.astro` → шаблон для `lager-dlya-malchikov`)
2. Создать `.astro` файл по структуре `LandingLayout`:
   - imports: LandingLayout, LandingHero, LandingTwoCol, Shifts, FAQ, RelatedPages, Gallery, ShiftBookModal, getRelatedPages, AskCta
   - `sections[]` — минимум 5 блоков h2 с покрытием ключей кластера
   - `<LandingLayout title= description= h1= canonical=>` в конце файла
   - `<Fragment slot="head">` с FAQPage Schema (4+ вопроса)
   - `<LandingHero slot="hero" h1= subtitle= breadcrumb= keywords= image= imageAlt= />`
3. Добавить в `src/data/landing-pages.ts` если нужны RelatedPages

#### `expand_content` — страница есть, позиция 21–50
1. Прочитать текущие секции
2. Найти ключи кластера, которых нет в тексте
3. Добавить 2–3 новые секции в конец `sections[]` с этими ключами
4. Если нет FAQ Schema — добавить

---

## Применение в dev (всегда через изолированный агент + копирование)

```bash
# Агент работал в worktree → копируем файл в main repo
cp /Users/vladimirafanasev/Aidacamp-cloude/.claude/worktrees/<id>/src/pages/<file>.astro \
   /Users/vladimirafanasev/Aidacamp-cloude/src/pages/<file>.astro

# Коммит с семантическим префиксом (pre-commit hook требует perf/feat/fix/refactor/chore)
MASTER_AGENT=1 git add src/pages/<file>.astro
MASTER_AGENT=1 git commit -m "perf(seo): кластер <name> — <что сделано>"

# Пуш
env MASTER_AGENT=1 git -C ~/Aidacamp-cloude push origin dev

# Сборка и деплой
npm run build 2>&1 | tail -5
SKIP_GIT_GUARD=1 ./scripts/deploy.sh dev 2>&1 | tail -3

# Обновить дашборд
ssh aidacamp "node /opt/seo-dashboard/build.js 2>&1 | tail -2"
```

### Шаг 5 — отметить done
```sql
UPDATE seo_cluster_progress
SET status='done', completed_at=NOW(), notes='<что изменено>'
WHERE cluster='<cluster>';
```

### Шаг 6 — доложить
```
✓ [cluster] action → /url | осталось: N
```

---

## Структура Astro-страниц (накопленный опыт)

### Шаблон LandingLayout (минимальный)
```astro
---
import '../styles/global.css';
import LandingLayout from '../layouts/LandingLayout.astro';
import LandingHero from '../components/LandingHero.astro';
import LandingTwoCol from '../components/LandingTwoCol.astro';
import Shifts from '../components/Shifts.astro';
import FAQ from '../components/FAQ.astro';
import RelatedPages from '../components/RelatedPages.astro';
import { getRelatedPages } from '../data/landing-pages';
import Gallery from '../components/Gallery.astro';
import ShiftBookModal from '../components/shifts/ShiftBookModal.astro';
import AskCta from '../components/AskCta.astro';

const sections = [
  { h2: "...", text: "...", list: ["..."] },
  { h2: "...", text: "..." },
];
---

<LandingLayout
  heroImage="/images/hero/<slug>.avif"
  title="Ключевой запрос 2026 — АйДаКемп"
  description="Конкретика: расстояние, цена, даты. ≤140 символов."
  h1="Ключевой запрос 2026 — подзаголовок"
  canonical="https://aidacamp.ru/<slug>"
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Вопрос с ключом?",
          "acceptedAnswer": { "@type": "Answer", "text": "Конкретный ответ с датами и ценами." } }
      ]
    })} />
  </Fragment>
  <LandingHero slot="hero"
    h1="Формулировка чуть иная"
    subtitle="Конкретика первым: дистанция, цена, смены"
    breadcrumb="Название страницы"
    keywords={["Факт 1 с цифрой", "Факт 2 с датой", "Факт 3 с ценой"]}
    image="/images/hero/<slug>.avif"
    imageAlt="Alt с ключом"
  />
  <LandingTwoCol sections={sections} />
  <Gallery />
  <Shifts />
  <FAQ />
  <ShiftBookModal />
  <RelatedPages pages={getRelatedPages(Astro.url.pathname)} />
  <section id="lead-form" class="mx-auto max-w-[1312px] px-4 py-10">
    <AskCta />
  </section>
</LandingLayout>
```

### Эталонные секции (паттерны которые работают)

**Секция с вопросом + список:**
```js
{
  h2: "Детский лагерь в [город] 2026 — как добраться",
  text: "Конкретный абзац без воды. Факты, цифры, расстояния.",
  list: [
    "Пункт с деталью — время/цена/факт",
    "Ещё пункт с конкретикой",
  ]
}
```

**Секция FAQ (добавлять в конец):**
```js
{
  h2: "Часто задаваемые вопросы",
  text: "Что чаще всего спрашивают перед записью.",
  list: [
    "Вопрос: ответ в одну строку",
    "Вопрос 2: ответ 2",
  ]
}
```

---

## Типичные оптимизации по типу кластера

| Тип | Что работает |
|---|---|
| Гео (город) | H1 "город 2026", трансфер от метро, расстояние в км, время в пути |
| Сезонный (июль/август) | Честно: занят/свободен + альтернативы, список смен с ценами |
| Аудитория (мальчики/девочки) | Программы по интересам, "из геймера → в создателя" |
| Оздоровительный | Медработник 24/7, бассейн без хлора, питание по СанПиН |
| Цена/путёвка | Таблица смен с ценами, налоговый вычет 13% (до 5 434 ₽), рассрочка |
| AI/программирование | Конкретные API (ChatGPT, Gemini), результат = рабочий проект |
| Каникулы | Смены июнь+август, июль занят, сравнение коротких и длинных смен |

---

## Правила качества

### ❌ ЗАПРЕЩЕНО
- Эмодзи в UI — только Bootstrap Icons `<i class="bi bi-*">`
- **Banned words:** единиц, баллов, leverage, seamless, robust, delve, landscape (метафора), moreover, furthermore, pivotal, utilize
- Хардкодить "до 5 200 ₽" — всегда "от 2 800 до 5 434 ₽ в зависимости от смены"
- `git push origin dev` без `MASTER_AGENT=1`
- Писать "сын" в цитатах Дарьи — у неё **дочь**

### ✅ ВСЕГДА
- "2026" в H1 сезонных страниц
- FAQ Schema ≥ 4 вопроса, ≥ 1 с годом
- title ≤60 символов, description ≤140 символов
- В новых section: слово "дети/ребёнок" — не более 2 раз на секцию, чередовать: "ребята", "школьники", "подростки"
- Иконки — только из `src/data/icons-manifest.json` (74 штуки)
- Семантический коммит: `perf(seo):`, `feat(seo):`, `fix(seo):`

---

## SEO-дашборд: критерии 100% готовности

### БД
| Таблица | Критерий | Как проверить |
|---|---|---|
| seo_pages | 140+ строк, h1≠'' у 90%+, word_count>0 у 90%+ контентных | `SELECT COUNT(*), ROUND(100*SUM(CASE WHEN h1!='' THEN 1 ELSE 0 END)/COUNT(*),1) FROM seo_pages` |
| seo_positions | 900+ уникальных ключей, накапливается ≥1 дата/день | `SELECT COUNT(DISTINCT keyword), COUNT(DISTINCT date) FROM seo_positions` |
| seo_queries | url != '' у 80%+ | `SELECT ROUND(100*SUM(CASE WHEN url!='' THEN 1 ELSE 0 END)/COUNT(*),1) FROM seo_queries` |
| seo_etl_log | EXISTS, status='ok' после запуска | `SELECT status FROM seo_etl_log ORDER BY started_at DESC LIMIT 1` |

### Дашборд (https://dev.aidacamp.ru/seo/)
- **Обзор:** ETL health + алерты каннибализации + snippet-проблемы + топ падений/ростов
- **Страницы:** URL/H1/title len/desc len/слов/трафик/ключей/лучшая позиция
- **Ключевые слова:** 900+ строк, keyword/URL/поз/объём/δ, Quick Wins не пуст
- **Каннибализация:** по keyword и по H1
- **ETL/Здоровье:** лог 10 запусков
- **Кластеры:** прогресс-бар, таблица статусов

### ETL: cron
```
0 14 * * *  /opt/seo-etl/run_all.sh       # ежедневный полный прогон
0 8  * * 1  /opt/seo-etl/weekly-positions.sh  # понедельник: отчёт
30 7 * * *  node /opt/seo-etl/seo_morning_pulse.js
```

---

## Известные проблемы и решения

| Проблема | Причина | Решение |
|---|---|---|
| `word_count = 0` у /shifts/* и /docs/* | Динамический контент + PDF | Удалить PDF из seo_pages; /shifts/* исключить из метрики |
| Все ключи landingAt='/' | Каннибализация: homepage перехватывает трафик | Усилить dedicated page: H1 с ключом, FAQ schema, больше контента |
| История позиций <30 дат | Topvisor запускает проверки не каждый день изначально | Накапливается само при ежедневном cron |
| Schema в дашборде = 0 | Краулер запустился до наших изменений | Запустить `node /opt/seo-etl/etl_crawl.js` после деплоя |
| Merge conflict в worktree | Worktree отстал от dev | Не мёрджить PR — копировать файлы напрямую и коммитить с MASTER_AGENT=1 |
| Pre-commit hook отклоняет коммит | Не семантический prefix | Использовать `perf(seo):`, `feat(seo):`, `fix(seo):` |

---

## Финальный отчёт (когда todo = 0)
```
## Грайндер завершён

Кластеров обработано: 24/24
Оптимизировано страниц: N
Создано новых страниц: N
Суммарный охват: ~XXX K объёма ключей

Следующие шаги:
1. Яндекс.Вебмастер → переобход изменённых URL
2. Через 2 недели: проверить δ позиций в Topvisor
3. Кластер 'other' (400 ключей, /) → отдельный аудит главной страницы
4. Алерт в Telegram при падении ETL — не реализован
```
