# Задача для Claude Code: export_context

## Цель

Написать скрипт `export_context.py`, который генерирует `chatgpt_context.md` —
полный контекст проекта АйДаКемп для работы в ChatGPT без доступа к Claude.

Запустил → получил файл → `ctx` в терминале → контекст в буфере.

---

## Что делает скрипт

1. Собирает статичный проектный контекст (захардкожен в скрипте)
2. Читает `TOOLS.md` из той же директории (полный справочник API)
3. Читает `ALL_FIXES.md` из той же директории (незакрытые баги, если есть)
4. Берёт последние 5 коммитов: `git log --oneline -5`
5. Собирает всё в `chatgpt_context.md`
6. Копирует в буфер через `pbcopy` (macOS, try/except — не критично)
7. Выводит итог в консоль

---

## Требования

- Python 3.8+, только stdlib (никаких pip install)
- При отсутствии TOOLS.md / ALL_FIXES.md — не падает, пишет предупреждение
- Итоговый файл: `chatgpt_context.md` рядом со скриптом

---

## Структура выходного файла

```
1. Заголовок + дата генерации
2. 👤 Кто я
3. 🏗 Инфраструктура
4. 🌐 Сайт aidacamp.ru
5. 📋 Незакрытые задачи P0/P1 (+ содержимое ALL_FIXES.md если есть)
6. 📊 Яндекс.Директ
7. 📱 VK Реклама
8. 🔐 Переменные окружения (таблица)
9. 🗄 PostgreSQL схема
10. ⚖️ Юридика
11. 📝 Последние коммиты (git, динамика)
12. 📖 TOOLS.md — полный справочник API (динамика из файла)
13. Финальная строка: «Конец контекста. Задавай вопросы или давай задачи.»
```

---

## Контент статических секций

Вставить в скрипт как многострочные f-string константы.

### 👤 Кто я

```
Влад Афанасьев — основатель:
- AidaCamp (АйДаКемп) — детский IT-лагерь, 66 км от Москвы (санаторий Изумруд)
- Codims / АйДаКодить — офлайн-школа программирования для детей
- Директолог (Яндекс.Директ), 3CX партнёр, автор книги «Факап №18»

Юрлица:
- ООО «Воип Коннект» (ИНН 7729713637) — туроператор, РТО 025773
- ИП Афанасьева Дарья Викторовна — образовательная лицензия

Стиль: неформально, без воды, сардонично. Голосовой ввод → фонетические опечатки.
```

### 🏗 Инфраструктура

| Что | Значение |
|---|---|
| Продакшн сервер | 159.194.223.55 |
| Dev сервер | 159.194.210.65 |
| Локальный проект | ~/Aidacamp-cloude |
| GitHub | github.com/afanasevvlad829-cyber/aidacamp-v2 (branch: main) |
| Obsidian vault | /Users/vladimirafanasev/Aidacamp-cloude/ |
| MCP сервер | mcp.aidacamp.ru |
| n8n | сервер:5678 |
| Node | v22 (nvm) |

nvm активация:
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22
```

Deploy → dev:
```bash
npm run build && rsync -avz --delete -e 'ssh -i ~/.ssh/aidacamp_prod' \
  dist/client/ root@159.194.223.55:/var/www/aidacamp-dev/current/client/
```

Deploy → prod: /var/www/aidacamp/current/

### 🌐 Сайт aidacamp.ru

- Стек: Astro + Tailwind
- Метрика ID: 96499295 | Лид-цель ID: 541048197
- AI-чатбот: /ask (Claude Haiku → OpenRouter, лог: ai_guard_flags)
- Hero mobile: без лид-формы, только чатбот + WA/TG
- Hero subtitle: «Пока другие на даче, ваш вернётся с AI-проектом — а у вас 14 дней для себя»
- Контакты: +7(968)808-64-55, hello@codims.ru, wa.me/79688086455, t.me/Progaschool
- Координаты лагеря: 55.265643, 36.724185

Kinescope IDs:
- video-01: qmLxu2S7uaS44CKkhoV1Jj
- video-02: tJAaAnvCYYJ5vRz7uyUepj
- video-03: naDfzrei9duApz3AnaencH
- video-04: eTmCgZHcwhcWQQs3HLCz1S
- video-05: s1SCYKqLx6C94fMRumitHF

UTM hero variants (файл: src/scripts/config/hero-variant-runtime.ts):
- tier1: 212861185/86/88 | tier2: 212861189/95/200
- tier3: 212861205/06/07 | tier4: 212861210/11/12 | broad: 212861214/15/16

Реферальная механика: пост-сабмит → «позови друга» → оба получают мерч.
Junior→футболка, Middle→толстовка. UTM: utm_source=refer&utm_medium=friend&utm_campaign=merch

Время ответа: 10 мин (11:00–20:00 МСК). «Свяжемся с 11 до 12» (20:00–11:00).

### 📋 Незакрытые задачи

P0 — AI-бот /ask:
- [ ] FACTS задублированы в validator.ts и campData.ts → объединить
- [ ] Хардкод смены в booking popup → динамический
- [ ] 4 рендерера с innerHTML вместо mkEl() → Astro scoping
- [ ] pg.Pool на каждый запрос → singleton
- [ ] Нет rate limiting
- [ ] ANTHROPIC_API_KEY не в server .env
- [ ] OrbitAvatar (aiState) не подключён к анимации

P0 — Darya bot:
- [ ] channel selection хардкодит "wa" вместо чтения pending_rules из PostgreSQL

P1 — Сайт:
- [ ] PageSpeed mobile: 69 → цель 85+
- [ ] team PNG → avif
- [ ] gallery JPGs → avif
- [ ] Kinescope lazy-load facade — запланирован
- [ ] ALL_FIXES.md: 18 незакрытых фиксов
- [ ] AgeBar modal восстановить (28–32% конверсия vs 5–7% без него)

### 📊 Яндекс.Директ

Кампании: РСЯ 708698819 | Поиск 708664426 | Ретаргет 708615379
Direct login: kv145

Правила групп:
- Регионы ТОЛЬКО [1, 213]. СПб (ID 2) — НЕ добавлять.
- Автотаргетинг: отключать сразу.
- Широкое/альтернативное: отключить.

Цели Метрики: form_submit 3000₽ | phone 1500₽ | whatsapp 1200₽ | telegram 1000₽ | shift 500₽

ПРАВИЛО: без данных из Метрики/Директа/Wordstat → маркировать «гипотеза».

### 📱 VK Реклама

Таргетинг: мамы 35–54. Самый активный сегмент: 45–54.
PROBLEM и INTENT кампании. КРАСИВОЕ protocol v2.0.

### 🔐 Переменные окружения

| Env var | secretctl | Что |
|---|---|---|
| DIRECT_TOKEN | Yandex | Яндекс.Директ API |
| METRIKA_TOKEN | Metrika | Яндекс.Метрика read |
| METRIKA_WRITE_TOKEN | merika_write | Яндекс.Метрика write |
| YADISK_TOKEN | Yandex_disk | Яндекс.Диск |
| VK_TOKEN | VK-business | VK Реклама |
| VK_ACCOUNT_ID | VK-business | VK аккаунт |
| OPENROUTER_KEY | OpenRouter | OpenRouter LLM |
| ANTHROPIC_API_KEY | ANTHROPIC_API_KEY | Anthropic Claude |
| OPENAI_API_KEY | OPENAI_API_KEY | OpenAI |
| TELEGRAM_BOT_TOKEN | Telegram-Token | Telegram Bot |
| DAILY_DIGEST_CHAT_ID | — | 244314247 |
| ALFACRM_API_KEY | Alfacrm | АльфаCRM |
| DATAFORSEO_LOGIN / KEY | dataforseo | DataForSEO |
| GEMINI_API_KEY | Gemini | Gemini Vision |
| KINESCOPE_TOKEN | kinescope | Kinescope |
| CLARITY_TOKEN | clarity | Microsoft Clarity |
| PAGESPEED_KEY | PageSpeed | Google PageSpeed |
| WORDSTAT_TOKEN | Wordstat | Яндекс.Wordstat |

На сервере: /opt/aidacamp-tools/etl/.env
На маке: secretctl run -k <СЕКРЕТ> -- <команда>

### 🗄 PostgreSQL

Сервер: 159.194.223.55, localhost:5432, БД: aidacamp, user: postgres

Таблицы:
- crm_contacts, crm_contact_contexts, crm_manager_notes, crm_coach_logs
- ai_dialogs, ai_tg_users, ai_guard_flags, pending_rules

Сервисы: aidacamp-mcp:3010 | crm-panel-api:6300 | n8n:5678 | nginx:80/443 | pg:5432
Скрипты: /opt/aidacamp-tools/ | Логи: /var/log/, /opt/aidacamp-tools/*.log

### ⚖️ Юридика

3CX спор с ООО «Компания БИО» (Курск):
- Fair Use Policy: введена 22.10.2025, enforcement с 01.04.2026
- Позиция: ст. 401 ГК РФ (форс-мажор). Клиент уведомлён за 35 дней до подписания.
- Статус: ответ на претензию направлен (.docx)

---

## Ожидаемый вывод в консоль

```
🔄 Генерирую chatgpt_context.md...
✅ Готово: /Users/vladimirafanasev/Aidacamp-cloude/chatgpt_context.md
   Размер: 52 KB, строк: 1350
   TOOLS.md: подключён (1072 строки)
   ALL_FIXES.md: не найден (пропущен)
   Git log: 5 коммитов добавлены
📋 Скопировано в буфер (pbcopy)
💡 Вставь chatgpt_context.md как первое сообщение в ChatGPT.
```

---

## Как запускать

```bash
# Разово:
python3 ~/Aidacamp-cloude/export_context.py

# Скопировать в буфер сразу:
python3 ~/Aidacamp-cloude/export_context.py && \
  cat ~/Aidacamp-cloude/chatgpt_context.md | pbcopy

# По крону каждое утро в 9:00:
# crontab -e → добавить:
0 9 * * * cd /Users/vladimirafanasev/Aidacamp-cloude && \
  python3 export_context.py >> /tmp/export_context.log 2>&1
```

---

## Алиас (добавить в ~/.zshrc)

```bash
alias ctx='python3 ~/Aidacamp-cloude/export_context.py && \
  cat ~/Aidacamp-cloude/chatgpt_context.md | pbcopy && \
  echo "📋 Контекст в буфере — вставляй в ChatGPT"'
```

После этого достаточно написать `ctx` в терминале.
