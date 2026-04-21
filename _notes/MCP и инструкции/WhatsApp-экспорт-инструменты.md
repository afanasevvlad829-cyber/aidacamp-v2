# WhatsApp-экспорт — инструменты и план

**Дата:** 2026-04-19
**Цель:** массово выгрузить переписку из рабочего WhatsApp (Business, номер школы) в JSON → Postgres → тот же анализ что делаем для Telegram.
**Объём:** 500–1 500 чатов, десятки тысяч сообщений.

---

## TL;DR — что делаем

**Основной путь:** **KnugiHK/WhatsApp-Chat-Exporter** + локальный backup телефона.
- Парсит `msgstore.db` (Android) или `ChatStorage.sqlite` (iOS) напрямую
- **Риск бана = 0** (ничего не подключается к серверам Meta)
- **Полная история** + медиа
- Потребуется: физический доступ к телефону на 10–20 минут для снятия бэкапа.

**Fallback** (если доступа к телефону нет): `whatsmeow` (Go) как linked device — но получим только ~3 мес истории и риск средний.

**НЕ делать:** `whatsapp-web.js` через Playwright на рабочем номере школы — высокий риск бана.

---

## Сравнение инструментов

| Инструмент | Runtime | Бэкфил истории | Риск бана | Подходит? |
|---|---|---|---|---|
| **KnugiHK/WhatsApp-Chat-Exporter** | Python | **полная** (парсит БД) | **нулевой** | ✅ **основной выбор** |
| whatsmeow (tulir) | Go | ~3 мес (multi-device sync) | средний | ⚠ fallback |
| Baileys (@whiskeysockets) | Node.js | ~3 мес | средний | ⚠ fallback |
| whatsapp-web.js (pedroslopez) | Node.js + Puppeteer | частично (лениво подгружает) | **высокий** | ❌ для school-номера |
| WhatsApp Business Cloud API (Meta) | REST | **нет** (только forward) | — | ❌ не даёт историю |
| Chrome extensions (WA Web Plus и т.п.) | браузер | ограниченно | высокий | ❌ не bulk, не JSON |

---

## Детали по выбранному решению

### KnugiHK/WhatsApp-Chat-Exporter
- **GitHub:** https://github.com/KnugiHK/WhatsApp-Chat-Exporter
- ~2 000 звёзд, активный
- Python. Ставится: `pip install whatsapp-chat-exporter`
- Вход: `msgstore.db` (Android) или `ChatStorage.sqlite` (iOS)
- Выход: HTML / **JSON** / plain text на каждый чат; медиа выгружает отдельной папкой
- Команды:
  ```bash
  # Android (расшифрованный msgstore.db)
  wtsexporter -a -j -o ./export_json
  # iOS (из iTunes/Finder backup)
  wtsexporter -i -b /path/to/ios_backup -j -o ./export_json
  ```

### Как снять backup (2 варианта)

**Вариант A: Android с root**
1. На телефоне: скопировать `/data/data/com.whatsapp/databases/msgstore.db.crypt15` + `/data/data/com.whatsapp/files/key`
2. Расшифровать на компе: `wa-crypt-tools` (https://github.com/ElDavoo/wa-crypt-tools)
   ```bash
   pip install wa-crypt-tools
   decrypt14_15 key msgstore.db.crypt15 msgstore.db
   ```
3. Запустить экспортёр.

**Вариант B: iPhone (проще!)**
1. Подключить iPhone к Mac → Finder → «Создать резервную копию» (БЕЗ галки «Зашифровать»).
2. Backup лежит в `~/Library/Application Support/MobileSync/Backup/<UDID>/`.
3. Запустить:
   ```bash
   pip install whatsapp-chat-exporter
   wtsexporter -i -b ~/Library/Application\ Support/MobileSync/Backup/<UDID>/ -j -o ./wa_export
   ```
4. Всё. JSON по каждому чату готов, медиа в отдельной папке.

> **Уточни, на каком телефоне сидит рабочий WA-аккаунт школы (Android или iOS)** — от этого зависит путь.

---

## Что дальше, после экспорта

1. Загрузить JSON-файлы на сервер в `/opt/tg-exports/wa_work_<date>/`
2. Написать парсер по аналогии с `/opt/etl/tg-import-desktop-export.py` → в ту же таблицу `ai_dialogs`:
   - `source = 'wa_export_<date>'`
   - `account_label = 'work_progaschool_wa'`
   - `peer_id = chat_id из msgstore.db`
   - `mid = message_id`
   - `direction = 'out'` если from_me=1, иначе `'in'`
3. Обогатить `ai_tg_users` (таблица универсальная, не только Telegram — переименуем в перспективе `ai_contacts`)
4. Матч телефонов: WA-номер ↔ AlfaCRM phone. По структуре WhatsApp `jid = '79681234567@s.whatsapp.net'` — нормализуем до последних 10 цифр.

Итог — **единый `ai_dialogs`** с TG и WA переписками, по одному клиенту можно смотреть полную историю обоих каналов.

---

## Риски и мигitation

| Риск | Mitigation |
|---|---|
| Владелец не готов дать телефон на 20 минут | iPhone — достаточно бэкапа, сам телефон можно не трогать если бэкапы уже в iCloud синхронизированы (хотя лучше свежий локальный) |
| На Android нет root | Купить вариант iOS-бэкапа или использовать старый WhatsApp Google Drive-бэкап (но он зашифрован — нужен пароль и ключи) |
| Утечка переписки клиентов | Бэкап и распакованный JSON хранить только на сервере, не коммитить в git, не пушить в облака. Путь `/opt/tg-exports/wa_*` уже в .gitignore. |
| Доступ команды к переписке | Postgres доступ только у администратора + Claude (через postgres peer auth). Никаких SQL-клиентов не ставим. |

---

## Оценка трудозатрат

- Снять бэкап телефона: **20 минут** (не моё)
- Расшифровка / запуск экспортёра: **30 минут** (не моё)
- Parser + import в Postgres по аналогии с TG: **1–2 часа** (моё, по команде)
- Матч WA ↔ CRM по телефонам: **1 час** (моё, после импорта)

**Итого от «дали бэкап» до «вся переписка в Postgres»: 2–3 часа работы автопилота.**

---

## Следующий шаг

Реши:
1. **Android или iOS** — на чём рабочий WhatsApp школы?
2. **Есть ли свежий iOS-бэкап** в iTunes/Finder на маке, или нужно делать?
3. **Готов ли отдать** ~20 минут телефона в тихом часу.

После этого — дай «делай», я напишу парсер и impoort заранее, чтобы как появится JSON — сразу прогнать.
