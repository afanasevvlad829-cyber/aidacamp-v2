# Интеграции Codims — Telegram + AlphaCRM

> Документация по подключению форм сайта codims.ru к Telegram-боту и AlphaCRM (S20).
> Реализовано: май 2026.

---

## Схема работы

```
Форма на сайте (LeadForm / BookingForm)
  ↓
POST /api/lead  (src/pages/api/lead.ts)
  ├── Telegram Bot → чат с заявкой
  └── AlphaCRM → новый клиент (лид) в CRM
```

---

## 1. Telegram

### Конфиг (`.env` на сервере)
```
TELEGRAM_BOT_TOKEN=8663835446:AAEJAemhHYPlVTc2RiLP3sBtsqCF9fBdhZ4
TELEGRAM_CHAT_ID=-1003827680494
```

### Формат сообщения
```
🎯 Новая заявка Codims
📞 +79001234567
🎂 10–12 лет
📚 Python
🖥 Офлайн
🔗 booking_form
📄 /courses/python
```

### Как получить CHAT_ID для нового чата
1. Добавь бота в группу/канал
2. Отправь любое сообщение
3. `curl https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Найди `"chat":{"id":...}` в ответе

---

## 2. AlphaCRM (S20)

### Конфиг (`.env` на сервере)
```
ALPHACRM_URL=https://codim.s20.online
ALPHACRM_EMAIL=pbalgoritmika@gmail.com
ALPHACRM_TOKEN=8db19d5a-837e-11e9-9333-0cc47a6ca50e
ALPHACRM_BRANCH=1
```

### Особенности S20 API (отличие от стандартного AlfaCRM)

| Параметр | Стандартный AlfaCRM | S20 (codim.s20.online) |
|---|---|---|
| Auth endpoint | `POST /v2api/user/auth` | `POST /v2api/auth/login` |
| Токен в заголовке | `X-Token: ...` | `X-Alfacrm-Token: ...` |
| Поле телефона | `"phone": "..."` | `"phone": ["+7..."]` (массив!) |
| Обязательные поля | — | `is_study`, `legal_type` |

### Процесс авторизации
```
1. POST https://codim.s20.online/v2api/auth/login
   Body: { "email": "...", "api_key": "..." }
   → { "token": "xxxxxxxx" }

2. Все запросы:
   Header: X-Alfacrm-Token: xxxxxxxx
```

### Создание клиента (лида)
```json
POST /v2api/customer/create
Header: X-Alfacrm-Token: <token>

{
  "name": "Имя клиента",
  "branch_ids": [1],
  "phone": ["+79001234567"],
  "is_study": 0,
  "legal_type": 1,
  "note": "Курс: Python | Формат: Офлайн | Источник: codims.ru"
}
```

### Значения полей
| Поле | Значение | Описание |
|---|---|---|
| `is_study` | `0` | Лид (не обучается) |
| `is_study` | `1` | Активный ученик |
| `legal_type` | `1` | Физическое лицо |

---

## 3. Где живёт код

| Файл | Назначение |
|---|---|
| `src/pages/api/lead.ts` | Единый эндпоинт — принимает заявки, шлёт в TG и CRM |
| `src/scripts/form-submit.ts` | Обёртка для LeadForm |
| `src/components/LeadForm.astro` | Форма с 2 чекбоксами |
| `src/components/BookingForm.astro` | Форма с выбором курса |
| `/var/www/codims-dev/.env` | Переменные окружения на сервере |

---

## 4. Тест

```bash
curl -s -X POST http://127.0.0.1:4182/api/lead \
  -H "Content-Type: application/json" \
  -d '{"phone":"+79001234567","age_group":"10–12 лет","course":"Python","format":"offline","source":"test","page":"/"}'
# → {"ok":true}  + сообщение в TG + клиент в CRM
```

---

## 5. Деплой

```bash
# После изменения .env:
systemctl restart codims-dev

# Полный деплой кода:
cd /var/www/codims-dev/repo && git pull origin agent/homepage-sections
npm run build
rsync -a dist/server/ /var/www/codims-dev/current/server/
rsync -a dist/client/ /var/www/codims-dev/current/client/
systemctl restart codims-dev
```

---

*Создано: 3 мая 2026*
