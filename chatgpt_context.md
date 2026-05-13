# 🧠 Рабочий контекст: АйДаКемп / Кодимс
> Файл для работы вне Claude. Вставь как первое сообщение в ChatGPT.
> Сгенерировано автоматически из TOOLS.md + памяти агента.

---

## 👤 Кто я

**Влад Афанасьев** — основатель:
- **AidaCamp (АйДаКемп)** — детский IT-лагерь, 66 км от Москвы (санаторий Изумруд)
- **Codims / АйДаКодить** — офлайн-школа программирования для детей
- Директолог (Яндекс.Директ), 3CX партнёр, автор книги «Факап №18»

**Юрлица:**
- ООО «Воип Коннект» (ИНН 7729713637) — туроператор, РТО 025773
- ИП Афанасьева Дарья Викторовна — образовательная лицензия

**Стиль:** неформально, без воды, сардонично. Голосовой ввод → бывают фонетические опечатки.

---

## 🏗 Инфраструктура

| Что | Где |
|---|---|
| Продакшн сервер | 159.194.223.55 |
| Dev сервер | 159.194.210.65 |
| Локальный проект | ~/Aidacamp-cloude |
| GitHub | github.com/afanasevvlad829-cyber/aidacamp-v2 (branch: main) |
| Obsidian vault | /Users/vladimirafanasev/Aidacamp-cloude/ |
| MCP сервер | mcp.aidacamp.ru |
| n8n | сервер:5678 |
| Nginx | 80/443, nginx 1.24 |
| Node | v22 (через nvm) |

**nvm активация на сервере:**
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22
```

**Deploy тест:**
```bash
npm run build && rsync -avz --delete -e 'ssh -i ~/.ssh/aidacamp_prod' dist/client/ root@159.194.223.55:/var/www/aidacamp-dev/current/client/
```

---

## 🌐 Сайт aidacamp.ru

- Стек: **Astro + Tailwind**
- Метрика: **96499295**
- AI-чатбот: `/ask` — Claude Haiku через OpenRouter, PostgreSQL логирование (ai_guard_flags)
- Мобильный hero: нет лид-формы, только чатбот + WA/TG кнопки
- Subtitle hero: «Пока другие на даче, ваш вернётся с AI-проектом — а у вас 14 дней для себя»

**Контакты:**
- Телефон: +7(968)808-64-55, +7(495)128-44-29
- Email: hello@codims.ru
- WA: wa.me/79688086455
- TG: t.me/Progaschool
- Координаты лагеря: 55.265643, 36.724185

**Kinescope видео:**
- video-01: qmLxu2S7uaS44CKkhoV1Jj
- video-02: tJAaAnvCYYJ5vRz7uyUepj
- video-03: naDfzrei9duApz3AnaencH
- video-04: eTmCgZHcwhcWQQs3HLCz1S
- video-05: s1SCYKqLx6C94fMRumitHF

**Реферальная механика:** пост-сабмит модал «позови друга» → оба получают мерч.
Junior (1-й) → футболка, Middle (2-й) → толстовка. UTM: utm_source=refer&utm_medium=friend&utm_campaign=merch

**Время ответа:** 10 мин (11:00–20:00 МСК), «свяжемся с 11 до 12» (20:00–11:00)

---

## 📋 Незакрытые баги / задачи (P0/P1)

### AI-бот /ask
- [ ] FACTS константы задублированы между `validator.ts` и `campData.ts` → объединить
- [ ] Хардкод выбора смены в booking popup → сделать динамическим
- [ ] 4 рендерера используют `innerHTML` вместо `mkEl()` → исправить для Astro scoping
- [ ] `pg.Pool` создаётся на каждый запрос → вынести в singleton
- [ ] Нет rate limiting → добавить
- [ ] `ANTHROPIC_API_KEY` не добавлен в server `.env` → добавить
- [ ] `OrbitAvatar` (aiState) существует, но не подключён к анимации

### Автоматизированная поддержка (Darya bot)
- [ ] **Баг channel selection:** `darya_feedback.py` / `generate_next_actions.py` хардкодит channel="wa" вместо чтения из таблицы `pending_rules` в PostgreSQL

### Сайт / PageSpeed
- [ ] PageSpeed mobile: 69 (цель: 85+)
- [ ] team PNG 400–520KB → конвертировать в avif
- [ ] gallery JPGs → конвертировать в avif
- [ ] Kinescope video: facade pattern (lazy-load on click) — запланирован, не сделан
- [ ] ALL_FIXES.md: 18 незакрытых фиксов

### VK
- [ ] AgeBar modal (.astro) удалён — нужно восстановить (28–32% конверсия с модалом vs 5–7% без)

---

## 📊 Яндекс.Директ

**Кампании:**
| Название | ID |
|---|---|
| РСЯ | 708698819 |
| Поиск | 708664426 |
| Ретаргет | 708615379 |

**Правила создания групп:**
- Регионы только [1, 213] (Москва + МО)
- СПб (ID 2) — НЕ добавлять
- Автотаргетинг — отключить сразу
- Широкое/альтернативное соответствие — отключить

**Цели Метрики (стоимость):**
| Цель | ID | Стоимость |
|---|---|---|
| form_submit | — | 3000₽ |
| phone_click | — | 1500₽ |
| whatsapp_click | — | 1200₽ |
| telegram_click | — | 1000₽ |
| shift_book_click | — | 500₽ |

**Метрика ID:** 96499295
**Лид-цель ID:** 541048197 (Отправка заявки-new)

**Правило данных:** любые утверждения о частотности запросов, поведении аудитории, эффективности без данных из Метрики/Директа/Wordstat — маркировать «гипотеза».

---

## 📱 VK Реклама

- Таргетинг: мамы 35–54 (расширено с 35–45)
- Самый активный сегмент: женщины 45–54
- PROBLEM и INTENT кампании
- КРАСИВОЕ protocol v2.0 задокументирован

---

## 🔐 Токены (секреты)

Токены хранятся в `secretctl` (Mac) и `/opt/aidacamp-tools/etl/.env` (сервер).
ChatGPT сам токены не берёт — при необходимости вводи вручную.

| Что | Env var | secretctl |
|---|---|---|
| Яндекс.Директ | DIRECT_TOKEN | Yandex |
| Яндекс.Метрика read | METRIKA_TOKEN | Metrika |
| Яндекс.Диск | YADISK_TOKEN | Yandex_disk |
| VK Реклама | VK_TOKEN | VK-business |
| OpenRouter | OPENROUTER_KEY | OpenRouter |
| Anthropic | ANTHROPIC_API_KEY | ANTHROPIC_API_KEY |
| OpenAI | OPENAI_API_KEY | OPENAI_API_KEY |
| Telegram Bot | TELEGRAM_BOT_TOKEN | Telegram-Token |
| АльфаCRM | ALFACRM_API_KEY | Alfacrm |
| DataForSEO | DATAFORSEO_LOGIN/KEY | dataforseo |

**Telegram основной чат:** DAILY_DIGEST_CHAT_ID=244314247
**Direct login:** kv145

---

## 🗄 PostgreSQL (сервер, только localhost)

БД: `aidacamp`, пользователь: `postgres`

**Таблицы:**
- `crm_contacts` — клиенты из АльфаCRM
- `crm_contact_contexts` — AI-резюме клиентов
- `crm_manager_notes` — заметки менеджеров
- `ai_dialogs` — переписки WA + TG
- `ai_tg_users` — маппинг телефон → TG peer_id
- `ai_guard_flags` — логи AI-бота
- `pending_rules` — правила для автоматизации (channel selection)

**Сервисы на сервере:**
| Сервис | Порт |
|---|---|
| aidacamp-mcp.service | 3010 |
| crm-panel-api.service | 6300 |
| n8n (docker) | 5678 |
| nginx | 80/443 |
| postgresql | 5432 |

---

## 📚 Контент / Codims

**Курс «AI-инструменты» (в разработке):**
- 32 урока, возраст 11+
- Финальный продукт: 3-серийный мини-сериал для YouTube/VK
- Стек: Open WebUI + LiteLLM + Redis + Langfuse + Excalidraw
- Стоимость сессии: ~$30–50
- Геймификация: «Streak + Jackpot» (монеты, 8 уроков/квартал, 1 пропуск разрешён)

**Telegram-канал «Факап»:**
- Авторский стиль: короткие абзацы, без мотивационной шелухи, сардонично
- Серия про AI-агентства: опыт с плохими поставщиками behavioral analytics

---

## ⚖️ Юридика

**3CX спор:**
- Ответчик: ООО «Компания БИО» (Курск)
- Суть: претензия по Fair Use Policy (введена 22.10.2025, enforcement с 01.04.2026)
- Позиция: ст. 401 ГК РФ (форс-мажор / политика вендора), клиент уведомлён за 35 дней до подписания
- Статус: ответ на претензию направлен (.docx)

---

## 🔧 Полезные API endpoints (быстрая шпаргалка)

### Яндекс.Директ
```
POST https://api.direct.yandex.com/json/v5/{method}
Auth: Bearer {DIRECT_TOKEN}
Header: Client-Login: kv145
```

### Яндекс.Метрика
```
GET https://api-metrika.yandex.net/stat/v1/data?ids=96499295&...
Auth: OAuth {METRIKA_TOKEN}
Конверсии: ym:s:goal{ID}reaches (НЕ ym:s:reaches + dimension goalName!)
```

### VK Реклама
```
GET https://api.vk.com/method/ads.{method}?access_token=...&account_id=...&v=5.131
```

### Яндекс.Диск
```
GET/PUT https://cloud-api.yandex.net/v1/disk/resources?path=disk:/...
Auth: OAuth {YADISK_TOKEN}
```

### Telegram
```
POST https://api.telegram.org/bot{TOKEN}/sendMessage
Body: {chat_id, text, parse_mode: "HTML"}
```

### OpenRouter / ChatGPT-совместимый
```
POST https://openrouter.ai/api/v1/chat/completions
Auth: Bearer {OPENROUTER_KEY}
Model: "anthropic/claude-3-5-haiku" | "openai/gpt-4o"
```
