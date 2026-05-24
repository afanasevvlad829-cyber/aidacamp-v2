# Единый портал aidacamp.ru/portal — дизайн

**Дата:** 2026-05-24
**Ветка:** `agent/portal-unify` → PR в `dev`
**Статус:** дизайн утверждён, готов к плану реализации

## 1. Цель

Свести образовательное приложение АйДаКэмп (танковый полигон Robocode +
материалы преподавателей + материалы/онбординг учеников), которое сейчас
живёт на `ai.aidacamp.ru`, в **единый портал** под адресом
`aidacamp.ru/portal` с:

- единой страницей входа,
- авторизацией по ролям (админ / преподаватель / ученик),
- единым брендстилем основного сайта (DESIGN_SYSTEM.md).

### Что НЕ входит в задачу (явные границы)

- `ai.aidacamp.ru` остаётся отдельным AI-проектом (Open WebUI / LiteLLM /
  SearXNG) — его не трогаем и не редиректим.
- Reports Hub (маркетинг/SEO/аналитика) и admin-инструменты основного сайта
  (`/admin/*`, `/staff/*`) в портал НЕ включаются — остаются как есть.
- Игровую логику робокода не переписываем (canvas + WSS Tank Royale).
- БД пользователей не создаём (роль = один пароль на роль).
- Прогресс ученика — переиспользуем существующий `teacher-api:8092`, новое
  хранилище не вводим.

## 2. Текущее состояние (факты с сервера 159.194.223.55)

- **Образовательный контент** — `/opt/aistudio/portal/*.html`
  (`onboarding-teacher`, `onboarding-student`, `teacher`, `student`,
  `handbook`, `quests`, `catalog`, `dashboard`, `tank-battle`, `arena`,
  `train`, `play`, `tank-intro`) + `/opt/robocode/teacher-api/lesson-*.html`.
- **Движок полигона** — localhost-сервисы, не привязаны к домену:
  - Tank Royale server (java) — `127.0.0.1:7654` (WSS).
  - bot-runner API (python) — `127.0.0.1:8095`.
  - teacher-api (docker) — `127.0.0.1:8092`.
  - + systemd: `robocode.service`, `robocode-arena`, `robocode-controller`,
    `robocode-botrunner`.
- **Основной сайт `aidacamp.ru`** — гибрид: статика из
  `/var/www/aidacamp/current/` + **Astro SSR (node `127.0.0.1:4181`)**, на
  который nginx уже проксирует `^~ /api/` и `^~ /p/`.
- **Репозиторий сайта** — `~/Aidacamp-cloude` (Astro 6 + Tailwind v4,
  `@astrojs/node` SSR-адаптер). Ветка разработки `dev`, прод через PR в `main`.

## 3. Архитектура (вариант A — Astro SSR-гейт)

Весь портал — внутри Astro-сайта, раздел `src/pages/portal/**`, отдаётся
через уже работающий node SSR на `:4181`. Тяжёлые сервисы робокода остаются
на своих портах; nginx добавляет только новые `location` под `/portal/`.

```
Браузер ──HTTPS──► nginx (aidacamp.ru)
   ├─ /portal/login, /portal/, /portal/...   → SSR node:4181 (Astro middleware-гейт)
   ├─ /portal/robocode-ws   → auth_request → proxy 127.0.0.1:7654 (WSS)
   ├─ /portal/teacher-api/  → auth_request → proxy 127.0.0.1:8092
   └─ /portal/api/bot/      → auth_request → proxy 127.0.0.1:8095
```

## 4. Модель доступа (роли, без БД)

- Секреты в окружении node-сервиса (НЕ в git):
  `PORTAL_PWD_ADMIN`, `PORTAL_PWD_TEACHER`, `PORTAL_PWD_STUDENT`,
  `PORTAL_SESSION_SECRET`.
- `/portal/login` (брендстиль) → `POST /api/portal/login`:
  сверяет введённый пароль с ролями, при совпадении ставит cookie
  `portal_session` = HMAC-подпись(`role` + `exp`), флаги
  **HttpOnly, Secure, SameSite=Lax**, срок 30 дней (продление при активности).
- `src/middleware.ts`: на любой `/portal/*` (кроме `/portal/login` и
  `/api/portal/login`) без валидной cookie → `302 /portal/login?next=…`.
  Валидная cookie кладёт `Astro.locals.role` для условного рендера.
- `GET /api/portal/check` — лёгкий `200`/`401` по cookie, для nginx
  `auth_request` (закрывает проксируемый движок).
- `POST /api/portal/logout` — стирает cookie.

### Видимость по ролям

| Раздел | admin | teacher | student |
|---|:---:|:---:|:---:|
| Хаб `/portal/` | ✓ | ✓ | ✓ |
| Полигон `/portal/poligon` | ✓ | ✓ | ✓ |
| Учителю (онбординг, уроки, методички) | ✓ | ✓ | — |
| Ученику (онбординг, квесты, каталог) | ✓ | ✓ (просмотр) | ✓ |
| Управление (турниры, teacher-api admin) | ✓ | — | — |

## 5. Карта URL и nginx

| URL | Назначение | Бэкенд |
|---|---|---|
| `/portal/login` | Страница входа | Astro SSR |
| `/portal/` | Хаб, разделы по роли | Astro SSR |
| `/portal/uchitelyu` | Онбординг + материалы препода | Astro SSR + teacher-api |
| `/portal/uchitelyu/uroki/[id]` | Урок | Astro SSR (контент из teacher-api/каталога) |
| `/portal/ucheniku` | Онбординг ученика | Astro SSR |
| `/portal/ucheniku/kvesty` | Квесты | Astro SSR + teacher-api |
| `/portal/ucheniku/katalog` | Каталог | Astro SSR |
| `/portal/poligon` | Танковая арена (брендовый shell + canvas) | Astro SSR + WSS |
| `/portal/robocode-ws` | WSS движка | proxy :7654 (auth_request) |
| `/portal/teacher-api/` | API уроков/прогресса | proxy :8092 (auth_request) |
| `/portal/api/bot/` | bot-runner | proxy :8095 (auth_request) |

Изменения в `aidacamp.conf` (прод) и `aidacamp-dev.conf` (dev):
добавить `location ^~ /portal/ { proxy_pass http://127.0.0.1:4181; ... }`
(перед `location /`), плюс три проксирующих `location` с `auth_request`.

## 6. Контент и перекраска в брендстиль

- Контентные страницы (хаб, онбординг препода/ученика, уроки, хендбук,
  квесты, каталог) — **переписываем нативно** в Astro-компоненты
  `src/components/portal/*` + страницы `src/pages/portal/*`, по DESIGN_SYSTEM:
  Tailwind utility-классы, Bootstrap-иконки из `icons-manifest.json`,
  **никаких эмодзи**, мин. шрифт 16px на мобилке, контраст WCAG AA.
- Игровая арена — `src/pages/portal/poligon.astro`: брендовая шапка/нав/кнопки
  (Astro), а игровой canvas + WSS-клиент подключаются как island/внешний
  скрипт, переиспользуя существующий игровой JS/ассеты из
  `/opt/aistudio/portal/` (переносим в `public/portal/engine/`); WSS указывает
  на `/portal/robocode-ws`.
- Уроки преподавателя — **динамический список** (источник: teacher-api или
  каталог файлов), чтобы новые материалы добавлялись без правки кода.

## 7. Безопасность

- Cookie HttpOnly + Secure + SameSite=Lax; HMAC-подпись (`PORTAL_SESSION_SECRET`).
- Rate-limit на `POST /api/portal/login` (защита от перебора пароля роли).
- Движок робокода (`robocode-ws`, `teacher-api`, `api/bot`) закрыт nginx
  `auth_request` — без валидной сессии бэкенды не отдаются.
- Секреты только в окружении сервиса, не в репозитории.

## 8. Выкат и git

- Ветка `agent/portal-unify` → PR в `dev` (прямой коммит в `main`/`dev`
  заблокирован хуками).
- Сборка `npm run build`; деплой **сначала на dev** (`dev.aidacamp.ru/portal`),
  проверка; затем PR `dev → main` и прод-деплой `./scripts/deploy.sh prod`.
- nginx-конфиги на сервере правятся отдельно (вне репо), с `nginx -t` перед
  reload; env-секреты задаются в окружении node-сервиса.

## 9. Тестирование

- Юнит: подпись/проверка cookie; маппинг пароль→роль; срок/просрочка.
- E2E (Playwright):
  1. неавторизованный заход на `/portal/poligon` → редирект на `/portal/login`;
  2. вход админом/преподом/учеником → видны корректные разделы;
  3. logout → доступ закрыт;
  4. WSS полигона открывается только с валидной сессией (через `auth_request`).
- Ручная проверка на dev: открыть арену под каждой ролью, сыграть бой,
  открыть урок, проверить мобильную вёрстку и контраст.

## 10. Открытые риски

- Игровой JS-движок может быть завязан на абсолютные пути/хост
  `ai.aidacamp.ru` — при переносе в `public/portal/engine/` нужно перепроверить
  все URL (WSS, ассеты, API) и заменить на относительные `/portal/...`.
- teacher-api может ожидать конкретный Origin/Host — проверить CORS при
  проксировании с нового домена.
- Объём контента (handbook 88KB, catalog 106KB, tank-battle 144KB) — перекраска
  «всё сразу» трудоёмка; в плане разбить на отдельные задачи по страницам.
