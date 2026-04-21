# Очередь задач

_Статусы: `QUEUE` → `IN_PROGRESS` → `PR_OPEN` → `MERGED` | `FAILED`_

---

## В работе

### [2026-04-20] ⭐⭐⭐ Lead enrichment — UTM/device/ym_client_id в TG-нотификации
- **Ветка:** `agent/lead-attribution-enrichment` (создана от origin/dev, коммитов нет)
- **Задача:** 
  1. `src/scripts/form-submit.ts` — добавить `collectContext()`: UTM из URL + sessionStorage persist (`ac_attribution`), ym_client_id (Metrika getClientID + `_ym_uid` cookie fallback), landing_url, referrer, screen/viewport/language/tz/session_ms
  2. `src/pages/api/lead.ts` — принимать весь контекст, rich TG с секциями (контакт / источник / поведение / устройство / IDs), AlfaCRM уже работает
- **Готовый код:** `.claude/sessions/2026-04-20-lead-enrichment.md` — там полные сниппеты
- **CRM-ошибка на сервере:** УЖЕ ИСПРАВЛЕНА (node перезапущен с env `ALFACRM_*`). PR нужен только для обогащения данных
- **Критерий готовности:** PR открыт, ревью Влада
- **Статус:** IN_PROGRESS (ветка есть, код не записан, PR не открыт)
- **PR:** —

### [2026-04-20] GSC — дожать переобход 13 статей (после лимита ~10/день)
- **Контекст:** 21.04 отправили в GSC топ-4 (ceny + problemy-v-obschenii + nizkaya-samootsenka + kak-pomoch) — упёрлись в дневной лимит. В Яндекс.Вебмастер — отправлены все 17.
- **Остаток (13 URL) — запустить утром 21.04 или позже:**
  - https://aidacamp.ru/stati/detskiy-lager-bez-telefonov/
  - https://aidacamp.ru/stati/hakaton-v-detskom-lagere/
  - https://aidacamp.ru/stati/igromaniya-u-detej/
  - https://aidacamp.ru/stati/ii-zamenit-programmista/
  - https://aidacamp.ru/stati/kak-izbavitsya-ot-zavisimosti-ot-igr/
  - https://aidacamp.ru/stati/kuda-det-rebenka-letom/
  - https://aidacamp.ru/stati/lechenie-kompyuternoj-zavisimosti/
  - https://aidacamp.ru/stati/podrostok-ne-hochet-uchitsya/
  - https://aidacamp.ru/stati/priznaki-kompyuternoj-zavisimosti/
  - https://aidacamp.ru/stati/profilaktika-kompyuternoj-zavisimosti/
  - https://aidacamp.ru/stati/vnutrennyaya-ekonomika-v-lagere/
  - https://aidacamp.ru/stati/zavisimost-ot-kompyuternyh-igr/
  - https://aidacamp.ru/stati/zavisimost-ot-telefona-u-podrostkov/
- **Способ:** GSC → URL Inspection → вставить → «Запросить индексирование». Лимит ~10/день → займёт 2 дня.
- **Статус:** WAITING_DAILY_LIMIT

### [2026-04-20] ⭐⭐⭐ Mobile UX — главная дыра конверсии
- **Проблема:** Smartphones bounce 55% vs PC 21% → 60% трафика теряется на мобилке
- **Воронка:** 21 «Выбрать смену» → 4 «Отправка заявки» = 81% drop-off на кнопке
- **Источники анализа:**
  - UX-аудит пользователя `aidacamp-audit.html` (62/100, 8 critical)
  - Метрика 19-20.04 (mobile 55% bounce)
  - Clarity dead-clicks 22% (в 4× выше нормы)
  - PageSpeed mobile 77, LCP 4.5s
- **План:** `_notes/АйДаКемп/Маркетинг/План-mobile-UX-фиксов-2026-04.md`
- **P0 (быстрые CSS, воркер aidacamp-v2):**
  1. body 14→16px мобилка
  2. line-height 1.65
  3. secondary text #767676 → #555
  4. CTA width:100% min-height:48px — **главное для 81% drop-off**
  5. orange CTA затемнить до #c45f00 (WCAG AA)
  6. padding 8→16px секций
- **P1 (1-2 дня):** dot-индикаторы свайпа карточек смен, sticky bottom call/WA панель, hero numbers above fold, синие акценты доверия
- **P2 (1 неделя):** LCP fix, legacy JS cleanup, render blocking
- **Ожидаемый эффект:** mobile bounce 55→35%, drop-off 81→60% → +2-3× заявок
- **Статус:** QUEUE (нужен worker aidacamp-v2)

### [2026-04-20] Клиентская база — реактивация платящих
- **Исполнитель:** stoic-payne (Claude) + ручные вводы от владельца
- **Зона:** `/opt/etl/dossier-v3.py`, `_notes/АйДаКемп/Клиенты/Реактивация-*`
- **Сделано:**
  1. Объединены TG (30k msgs) + WA (19k msgs, через Green-API) + AlfaCRM (2947 customers, 12385 comments)
  2. Написан dossier-классификатор v3 с декомпозицией жизненного статуса и contact_safety
  3. Реактивационный пул: 810 человек → **355 безопасных для касания** (SAFE+WARM), 455 COLD (не писать)
  4. Основной канал 96% — WhatsApp
  5. CSV: `_notes/АйДаКемп/Клиенты/Реактивация-пул.csv`
  6. Отчёт: [[Реактивация-финальный-отчёт]]
- **Ожидает от владельца:**
  - 3-4 админских номера прошлых лет (доступ: Green-API / TG Export / WA Finder backup) → ещё 500-1500 SAFE-контактов
- **Следующее:** когда номера придут — backfill в `ai_dialogs` с новыми `account_label='work_admin_*'` и пересчёт contact_safety
- **Статус:** WAITING_INPUT (ждём номера)

### [2026-04-19] Задача ⭐⭐⭐: SEO — 301-редиректы 26 Tilda-страниц на Astro
- **Исполнитель:** stoic-payne worker (через SSH на сервер)
- **Зона:** `/etc/nginx/sites-enabled/aidacamp.conf` на `159.194.223.55`
- **Что сделано (2026-04-19 18:03 UTC):**
  1. Заменил catch-all `rewrite ^/tpost/.*$ / permanent;` на 26 точечных `rewrite` + 2 catch-all (для `/tpost/*` и `/stati/tpost/*`)
  2. `nginx -t` OK, `systemctl reload nginx` OK
  3. Бэкап: `/etc/nginx/backups/aidacamp.conf.bak-20260419-180139`
  4. Убрал лишние `.bak` файлы из `sites-enabled/` (создавали conflicting server name)
  5. Проверил топ-5 URL curl'ом — все 5 отдают `HTTP 301` + корректный Location
- **⚠️ ВАЖНО — блокер мержа PR #17:**
  - 3 из 5 топовых целевых Astro-URL отдают **404**:
    - `/stati/problemy-v-obschenii-podrostkov/` (878 imps/90д) → 404
    - `/stati/nizkaya-samootsenka-u-rebenka/` (645 imps/90д) → 404
    - `/stati/kak-pomoch-podrostku-kotoryj-nichego-ne-hochet/` (510 imps/90д) → 404
  - Эти 3 статьи **есть только в PR #17** (Tilda migration). Пока PR не замержен и не задеплоен — пользователи Google попадают на 404. Суммарно **2033 impressions/90д** болтаются в воздухе.
  - **→ Оркестратору: приоритетно мержить PR #17 + dev→main deploy**
- **Остаётся после мержа:**
  1. Отправить переиндексацию в GSC (URL Inspection → Request Indexing по 5 топовым `/stati/*`)
  2. Переобход страниц в Яндекс.Вебмастере (лимит 20/сутки)
  3. IndexNow: бонусный скрипт для ускоренной индексации Яндекса (опционально)
- **Статус:** DONE (nginx-часть); переиндексация — после мержа PR #17

### [2026-04-19] Задача: починить CI Quality Gate
- Ветка: `agent/fix-ci-quality-gate`
- Агент: sub-agent
- Зона: `.github/workflows/quality-gate.yml`
- Задача: workflow пытается `chmod +x tools/quality-*.sh`, которых нет в ветке сайта. Переписать workflow так, чтобы он подтягивал `tools/` из orphan-ветки `tooling` (см. её README), и запускал `quality-check.sh`. Если скрипты не работают из коробки — упростить до `npm ci && npm run build` (билд = минимум, ниже опускаться нельзя).
- Критерий готовности: PR открыт в `dev`, CI `Quality Gate` на этом PR зелёный
- Статус: IN_PROGRESS
- PR: —
- Комментарий: tooling-ветка уже создана оркестратором (orphan), запушена на origin

### [2026-04-19] Задача: SEO — точная перелинковка главной на LP
- Ветка: `agent/seo-main-links`
- Агент: Claude (stoic-payne worktree)
- Зона: `src/pages/index.astro`
- Задача: Исправить массив `allLandingPages` — добавить 2 пропущенные жирные LP (/lager-na-leto-2026, /kupit-putevku-v-lager), переписать якоря под целевые ключи word-keeper, переупорядочить по весу (first-link-wins)
- Критерий готовности: PR в dev, сборка без ошибок, все 18 ссылок работают
- Статус: PR_OPEN
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/4
- Комментарий: Следующий Шаг 2 — расширение контента LP (≥500 слов уникально на каждой жирной LP) — отдельная задача

---

## Очередь

### [2026-04-19] Задача: SEO — уникальные hero-изображения для 4 новых LP
- Ветка: `agent/seo-hero-images` (запланирована)
- Агент: нужен доступ к AI-генерации или Gallery-исходникам
- Зона: `public/images/hero/python-lager.avif`, `scratch-lager.avif`, `roblox-lager.avif`, `3d-modelirovanie-lager.avif` (новые) + обновить `heroImage` в `src/pages/{python-lager,scratch-lager,roblox-lager,3d-modelirovanie-lager}.astro`
- Задача: сейчас 4 новые LP используют fallback-картинки от других LP (из PR #7). Заменить на уникальные — либо AI-generated (Midjourney/DALL-E), либо тематические стоковые с соответствующей атрибуцией
- Критерий готовности: 4 уникальные картинки 1100px+ avif, alt-тексты содержат целевые ключи
- Статус: QUEUE (блокер: нужна AI-tool или исходники)

### [2026-04-19] Задача: SEO — расширение контента ТОП-5 LP (Шаг 2)
- Ветка: `agent/seo-content-top5-lp`
- Агент: Claude (stoic-payne worktree)
- Зона: `src/pages/{detskiy-lager,detskiy-lager-podmoskove,lager-v-podmoskove,lager-na-leto-2026,kompyuternyy-lager}.astro`
- Задача: На 5 жирных LP добавить уникальные блоки контента (≥500 слов), которых нет на главной. Использовался существующий компонент `LandingTwoCol` (массив `sections` расширен 3-4 новыми `{h2, text, list}`)
- Критерий готовности: PR в dev, уникальность текстов подтверждена
- Статус: PR_OPEN
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/5
- Комментарий: Добавлено ~2000 слов суммарно (367/371/368/398/522 per LP). Без пересечения с PR #4.

### [2026-04-19] Задача: SEO — CTA-переделка blog-статей (Шаг B)
- Ветка: `agent/blog-cta-rewrite`
- Агент: Claude (stoic-payne worktree)
- Зона: `src/pages/stati/*.astro`
- Задача: Переписать title/description у 4 слабых статей под Позиционирование (тон «подруги»). У всех 8 статей заменить CTA-ссылки с `aidacamp.ru` на целевые LP с ключевым анкорным текстом. У 2 статей без CTA — добавить кнопку.
- Критерий готовности: 0 ссылок на `aidacamp.ru` в CTA (были на главную), 8 новых ссылок на LP
- Статус: PR_OPEN
- PR: https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/6
- Комментарий: 8 файлов, +25/-16 строк

### [2026-04-19] Задача: brand-positioning — обновление CLAUDE.md и документов
- Ветка: `agent/brand-positioning-docs`
- Зона: `CLAUDE.md`
- Задача: Внести в CLAUDE.md блок про позиционирование (образ Дарьи, TOV, 5 вопросов перед любым текстом). Согласован с _notes/АйДаКемп/Маркетинг/Позиционирование бренда.md (локально)
- Статус: QUEUE (правка уже сделана локально на dev, нужно перенести в ветку)

---

## Завершённые

_(пусто)_

---

## Шаблон записи

```
### [дата] Задача: название
- Ветка: agent/имя-задачи
- Агент: номер/имя инстанса
- Зона: src/components/**, etc.
- Задача: что именно нужно сделать
- Критерий готовности: как проверить
- Статус: IN_PROGRESS
- PR: (ссылка появится когда агент создаст)
- Комментарий: —
```
