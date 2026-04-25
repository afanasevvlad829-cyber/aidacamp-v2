# Архитектура Chrome Extension для захвата Telegram — состояние 18.04.2026

> Версия v1.2 (последняя). Папка: `/Users/vladimirafanasev/chrome-ext-tg-debug/`
> Цель: пассивный сбор переписок клиентов из Telegram Web без MTProto.

---

## 1. Зачем (бизнес-цели)

### Почему не MTProto через telethon
- `my.telegram.org` для регистрации app **блокирует VPN** (на Хабре много жалоб)
- Через российский IP — заблокирован
- Через VPN — `[object Object]` ошибка после ввода кода (Telegram отбрасывает запрос)
- Альтернатива «попросить кого-то в EU» отложена
- **Pivot:** использовать `web.telegram.org` через Chrome extension — Telegram не банит за чтение собственного DOM

### Что должно делать
1. Собирать **всю переписку** с клиентами из всех 3 аккаунтов:
   - Vladimir Afanasiev (личный, **skip**)
   - АйДаКемп (рабочий, **work** — 879+ чатов с клиентами)
   - Иришка (мониторинг внешних чатов, **monitor**)
2. Различать **аккаунты** (`?account=N` в URL) → label per account
3. Для каждой bubble сохранять:
   - `chat_peer_id` (стабильный для чата) и `sender_peer_id` (кто написал)
   - `direction` (in/out), `is_read`, текст, timestamp
4. **Дедуп** на уровне БД — один и тот же mid от разных устройств не дублируется
5. **Автопилот** — программно проходит все ~879 чатов и собирает историю без ручного клика
6. Данные → в Postgres, далее scoring клиентов через LLM

### Будущее (по той же схеме)
- WhatsApp Web (`web.whatsapp.com`) — content_wa.js
- Max Web (`web.max.ru`) — когда у user разблокируют
- 3-5 менеджеров устанавливают одинаковое extension → данные стекаются в одну БД

---

## 2. Файлы

### Локально (Mac)
```
/Users/vladimirafanasev/chrome-ext-tg-debug/
├─ manifest.json       — Manifest V3, host permissions для web.telegram.org/*
└─ content_tg.js       — главный код, ~480 строк, версия v1.2
```

### Сервер (aidacamp.ru)
```
/opt/tg-debug-server.py            — Python http.server listener (port 9099)
/etc/systemd/system/tg-debug.service — systemd unit (User=postgres для peer-auth БД)
/var/log/tg-debug.log              — все snapshot'ы (raw JSON по строке)
/etc/nginx/sites-enabled/aidacamp.conf — nginx route /api/tg-debug/ → 127.0.0.1:9099
```

---

## 3. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│ Browser Chrome (на Mac у user)                          │
│                                                         │
│  Tab: web.telegram.org/k/?account=2#@username          │
│   ├─ Telegram Web K (React app)                         │
│   └─ content_tg.js (extension content script)           │
│        ├─ Overlay (bottom-right): version, label, log   │
│        ├─ Парсер `.bubble[data-mid]` → структуры        │
│        ├─ tick() каждые 2 сек (auto-snapshot)           │
│        ├─ Autopilot: scroll sidebar, click chats        │
│        └─ HTTP POST → endpoint                          │
└────────────────┬────────────────────────────────────────┘
                 │ HTTPS POST (CORS open)
                 ↓
┌────────────────────────────────────────────────────────┐
│ aidacamp.ru / nginx                                    │
│   /api/tg-debug → proxy → 127.0.0.1:9099              │
└────────────────┬───────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ /opt/tg-debug-server.py (systemd: tg-debug.service)    │
│   port 9099                                            │
│                                                        │
│   POST /                                               │
│     ├─ всегда: write JSON line to /var/log/tg-debug.log│
│     ├─ if type=dialog_snapshot:                        │
│     │     INSERT INTO ai_dialogs                       │
│     │     ON CONFLICT (source, account_label,          │
│     │                  peer_id, mid) DO NOTHING        │
│     ├─ if type=autopilot_step:                         │
│     │     INSERT INTO ai_autopilot_log                 │
│     │     UPSERT INTO ai_chats                         │
│     └─ если pol=personal/skip → пропускаем             │
└────────────────┬───────────────────────────────────────┘
                 ↓
┌────────────────────────────────────────────────────────┐
│ Postgres aidacamp                                      │
│   ai_dialogs        — все сообщения (UNIQUE индекс)    │
│   ai_chats          — список чатов (даже пустых)       │
│   ai_autopilot_log  — лог каждого шага автопилота      │
└────────────────────────────────────────────────────────┘
```

---

## 4. Детали content_tg.js

### Multi-account через ?account=N
```js
function getCurrentAccountKey() {
  const acc = new URL(location.href).searchParams.get('account') || '1';
  return `acc_${acc}`;
}
```

`chrome.storage.local` хранит:
```json
{
  "tgext_account_labels": {
    "acc_1": {"display": "Vladimir Afanasiev", "label": "personal"},
    "acc_2": {"display": "АйДаКемп # АйДаКодить", "label": "work"},
    "acc_3": {"display": "Иришка", "label": "monitor"}
  }
}
```

При смене URL (переключение аккаунта в гамбургер-меню) → extension обнаруживает → подхватывает label из storage.

### Парсинг bubbles (правильный — для групп)
```js
function parseBubbles() {
  const bubbles = document.querySelectorAll('.bubble[data-mid]');
  const chatPeerId = getChatPeerId();  // из URL hash
  const msgs = [];
  let lastSenderId = null, lastSenderName = null;  // для continuation

  for (const b of bubbles) {
    const is_out = b.classList.contains('is-out');
    const hide_name = b.classList.contains('hide-name');

    let sender_peer_id = null, sender_name = null;
    if (is_out) {
      sender_peer_id = 'self';
    } else {
      const nameEl = b.querySelector('.name[data-peer-id], .colored-name[data-peer-id]');
      if (nameEl) {
        sender_peer_id = nameEl.dataset.peerId;
        sender_name = nameEl.querySelector('.peer-title-inner')?.textContent?.trim();
        lastSenderId = sender_peer_id; lastSenderName = sender_name;
      } else if (hide_name && lastSenderId) {
        sender_peer_id = lastSenderId; sender_name = lastSenderName;
      }
    }
    // text, ts, mid, is_read из data-атрибутов и querySelector
    msgs.push({ mid, ts, is_out, is_read, text, chat_peer_id: chatPeerId, sender_peer_id, sender_name });
  }
  return msgs;
}
```

### Chat peer_id из hash
```js
function getChatPeerId() {
  const h = location.hash;
  // #-12345 (группа) или #12345 (user) → числовой ID
  const m = h.match(/#(-?\d+)/);  if (m) return m[1];
  // #@username → строковый ID с префиксом @
  const u = h.match(/#(@[a-zA-Z0-9_]+)/);  if (u) return u[1];
  return null;
}
```

В БД `peer_id TEXT` чтобы хранить и `-12345` и `@username`.

### Скролл-контейнер (v1.2 fix)
**v1.0 проблема:** искал `.bubbles.scrollable-y, .bubbles-inner` — не находил
**v1.2 фикс:**
```js
const findContainer = () => {
  const all = [...document.querySelectorAll('.scrollable.scrollable-y')];
  return all.find(el => el.querySelector('.bubble[data-mid], .bubbles-inner'))
    || document.querySelector('.bubbles-inner')?.closest('.scrollable.scrollable-y')
    || null;
};
```

Логика: ищем тот `.scrollable.scrollable-y`, **внутри которого** лежат bubbles. Игнорируем sidebar-скроллер.

### Скролл истории до начала с инкрементальным сбором
```js
async function scrollChatToBeginning(maxSeconds=40, onTickBatch=null) {
  if (onTickBatch) await onTickBatch();  // первый снапшот = последнее окно
  while (Date.now() < deadline) {
    container.scrollTop = 0;
    await sleep(700);
    if (onTickBatch) await onTickBatch();  // снапшот после подгрузки
    // выходим если 3 итерации подряд без новых mid
  }
}
```

Telegram Web K использует **virtual scroll** — старые bubbles удаляются из DOM. Поэтому `tick()` нужен НА КАЖДОЙ итерации, не только в конце.

Дедуп через `ON CONFLICT DO NOTHING` сливает одинаковые mid из разных снапшотов.

### Autopilot
```js
async function autopilot({ maxChats, delayPerChat=15000, scrollHistory=true }) {
  let list;
  if (maxChats <= 20) {
    // Test mode — берём видимые в DOM
    list = [...document.querySelectorAll('.chatlist-chat')]
      .slice(0, maxChats)
      .map(el => ({ title: ..., element: el }));
  } else {
    // Полный прогон — кликаем на «All» tab + скроллим sidebar для virtual scroll
    const allTab = folders.find(f => f.textContent.toLowerCase() === 'all' || === 'все');
    allTab.click(); await sleep(2000);
    list = await collectAllChats(120);  // инкрементальный скролл sidebar
  }

  for (let i = 0; i < list.length; i++) {
    // React-совместимый MouseEvent (не .click())
    clickable.dispatchEvent(new MouseEvent('mousedown', {bubbles, ...}));
    await sleep(80);
    clickable.dispatchEvent(new MouseEvent('mouseup', {...}));
    clickable.dispatchEvent(new MouseEvent('click', {...}));

    await sleep(3500);
    // sendBatch — инкрементальный сбор по мере scroll
    if (scrollHistory) await scrollChatToBeginning(40, sendBatch);
    // лог в ai_autopilot_log
    await send({ type: 'autopilot_step', idx, total, status: ok|empty, ... });
    await sleep(delayPerChat - 3500);
  }
}
```

---

## 5. БД-схема (3 таблицы для extension)

```sql
ai_dialogs (
  id, source ('tg'/'wa'/'max'), peer_id TEXT, peer_username, chat_title,
  mid TEXT, ts TIMESTAMPTZ, direction ('in'/'out'), is_read,
  text, raw JSONB, account_label TEXT, sender_peer_id TEXT, sender_name TEXT,
  customer_id BIGINT REFERENCES ai_customers,
  processed BOOLEAN DEFAULT FALSE,
  UNIQUE INDEX (source, COALESCE(account_label, ''), peer_id, mid)
)

ai_chats (
  id, source, account_label, peer_id TEXT, peer_username, chat_title,
  is_group BOOLEAN, messages_seen INT,
  first_seen_at, last_seen_at,
  customer_id BIGINT REFERENCES ai_customers,
  UNIQUE (source, account_label, peer_id)
)

ai_autopilot_log (
  id, account_key, account_label, idx, total,
  expected_title, expected_hash, actual_title, actual_hash,
  messages_found INT, status ('ok'/'empty'/'not_opened'/'error'),
  created_at
)
```

---

## 6. Что РАБОТАЕТ (подтверждено эмпирически)

✅ Multi-account детекция через `?account=N`
✅ Per-account label storage (work/monitor/personal/skip)
✅ Skip для personal/skip — снапшоты не отправляются
✅ Парсинг bubbles в личных чатах (Артём Папа: 17 сообщений с правильным peer_id)
✅ Парсинг bubbles в групповых (ПБ63 Unity: 4 разных автора с именами и ID)
✅ Continuation для `hide-name` (наследует автора от предыдущей bubble)
✅ Дедуп в БД через UNIQUE индекс
✅ Endpoint /api/tg-debug на nginx + systemd-service для listener'а
✅ Real-time запись в Postgres
✅ Autopilot v1.2 — переключает чаты через настоящий MouseEvent
✅ ai_chats список чатов (empty + ok)
✅ ai_autopilot_log лог каждого шага

---

## 7. Что НЕ доделано (по приоритету)

### 🔴 Критично — для ночного прогона
1. **scrollChatToBeginning v1.2 fix НЕ протестирован пользователем**
   - В предыдущем тесте брал только 17-18 сообщений из чата (даже из больших групп)
   - Причина: неправильный селектор контейнера (искал `.bubbles.scrollable-y`)
   - В v1.2 переделан: ищет `.scrollable.scrollable-y` который содержит `.bubble`
   - Не подтверждено что после фикса история собирается полностью
   - **Тест:** ▶ Autopilot → `3` (включая длинную группу) → проверить что в БД у длинных групп >50 сообщений → если ОК, запускать `all`

### 🟡 После полного прогона
2. **Маппинг диалогов → клиентов AlfaCRM**
   - По `peer_username` (если у клиента в AlfaCRM есть tg)
   - По `phone` (нормализация → match)
   - Fuzzy match по имени (Дарья Викторовна Афанасьева ↔ Афанасьева Дарья)
   - Через Green-API checkAccount можно проверить — есть ли у phone tg-аккаунт

3. **LLM-процессор диалогов** (новый n8n workflow)
   - Раз в N часов читает unprocessed `ai_dialogs`
   - Группирует по customer_id
   - Извлекает: intent (вопрос/жалоба/покупка/отказ), tone, urgency
   - Обновляет `ai_customer_scores`
   - Генерирует `ai_next_actions` (3 варианта сообщения)

4. **Briefing-карточка в Chrome extension AlfaCRM Max Contact Link**
   - Endpoint `/customer/briefing?phone=...` → JSON с score + variants + history
   - Patch для существующего content.js (~150 строк JS)

### 🟢 Расширения
5. **Очистка хвостов времени** в text — «Спасибо!**15:25**» → regex post-processing
6. **WhatsApp Web** content_wa.js по той же схеме
7. **Max Web** когда разблокируют у user
8. **Автопилот раз в N часов** — фоновый сбор новых сообщений

---

## 8. Известные ограничения и риски

### Telegram Web K specifics
- **Virtual scroll** — старые bubbles удаляются из DOM при прокрутке. Решено инкрементальным `tick()` на каждой итерации скролла.
- **Multi-account через `?account=N`** — номер привязан к порядку логина в этом конкретном Chrome. На другой машине тот же TG-аккаунт может быть под другим номером.
- **React events** — `.click()` не работает, нужен настоящий `MouseEvent` с координатами.
- **Hash routing** — `#-12345`, `#12345`, `#@username`. Через `location.hash = ...` НЕ работает (React не подхватывает). Нужен реальный клик по DOM-элементу.
- **isolated world** — `window.__tgExt` доступен только в content script context, НЕ в DevTools console main world. Для отладки — кнопки в overlay или MAIN-world инжект.

### Безопасность Telegram
- Чтение собственного DOM — не нарушает ToS Telegram (эквивалент scroll'а мышкой)
- Риск бана возникает при: спам-рассылках, массовом outbound, парсинге чужих чатов
- **Автопилот с паузами 15 сек** — выглядит как нормальный пользовательский browsing
- НЕ запускать с миллисекундными интервалами — это уже похоже на бота

### Производительность
- Active-вкладка обязательна — Chrome throttle'ит таймеры в фоне (15-сек паузы становятся 1-2 минуты)
- 879 чатов × ~18 сек ≈ 4.5 часа на полный прогон
- В фоне может занять 1-2 дня

### Не покрыто
- Удалённые сообщения — невозможно (стёрты сервером)
- Чаты в архиве без открытия — DOM пуст пока не кликнешь
- Чаты в spam-ящике — Telegram прячет сам

---

## 9. История версий

| Версия | Что изменилось |
|---|---|
| v0.1 | MVP overlay + базовая отправка stats |
| v0.2 | Парсинг dialog_snapshot с messages |
| v0.3 | Autopilot (но через `.click()` — не работало в React) |
| v0.4 | Multi-account через storage |
| v0.5 | promptLabel + display name |
| v0.6 | iterateFolders + sidebar virtual scroll |
| v0.7 | maxChats prompt + test mode |
| v0.8 | TEST mode без iterateFolders + правильный peer_id из hash |
| v0.9 | Автопилот через настоящий MouseEvent + ai_autopilot_log |
| v1.0 | Правильный sender_peer_id из `.name[data-peer-id]` + continuation |
| v1.1 | Инкрементальный sendBatch на каждой итерации scroll |
| v1.2 | Правильный selector скроллера (`.scrollable.scrollable-y` containing `.bubble`) |

---

## 10. Команды для отладки

```bash
# Перезапуск listener'а
sudo systemctl restart tg-debug
sudo systemctl status tg-debug

# Хвост лога snapshot'ов
sudo tail -f /var/log/tg-debug.log

# Тест endpoint'а
curl -X POST -H "Content-Type: application/json" \
  -d '{"type":"dialog_snapshot","chat":{"username":"test","title":"Test"},"messages":[{"mid":"T1","peerId":"999","ts":1776083118,"is_out":true,"is_read":true,"text":"hi"}],"account_label":"work"}' \
  https://aidacamp.ru/api/tg-debug

# Сводка БД
sudo -u postgres psql -d aidacamp -c "
  SELECT account_label, count(DISTINCT peer_id) chats, count(*) msgs
  FROM ai_dialogs WHERE source='tg' GROUP BY 1;"
```

```javascript
// В консоли вкладки Telegram (Cmd+Opt+J) — диагностика
__tgExt.chat()        // текущий чат info
__tgExt.messages()    // что видит парсер сейчас
__tgExt.chats()       // первые 20 чатов в сайдбаре
__tgExt.send({type:'test'})  // тестовая отправка
__tgExt.autopilot({maxChats:3, delayPerChat:8000})  // тест
```
