# ✅ SERP CTR Optimization — Setup Complete

**Дата:** 2026-05-04  
**Статус:** 🟢 Fully Documented & Monitored  
**PR:** [#209](https://github.com/afanasevvlad829-cyber/aidacamp-v2/pull/209)

---

## 📋 Что было сделано

### 1️⃣ Документация
✅ **Создана:** `_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md`
- Полное описание проекта
- Стратегия оптимизации
- Целевые ключевые слова
- Контрольные метрики
- Анализ рисков
- Инструкции по откату

### 2️⃣ Мониторинг (3 скрипта)

✅ **`scripts/serp-ctr-monitor-daily.sh`** — ежедневная проверка
- CTR (Яндекс.Вебмастер)
- Bounce rate (Clarity)
- Органический трафик (Метрика)
- Конверсии (Goal 541048270)
- **Запуск:** 09:07 MSK каждый день
- **Логи:** `/tmp/serp-monitor-daily.log`

✅ **`scripts/serp-ctr-monitor-weekly.sh`** — еженедельный отчёт
- Сравнение метрик: неделя ДО vs ПОСЛЕ оптимизации
- % изменения по каждому KPI
- Сохраняется в документацию
- **Запуск:** 10:13 MSK каждый понедельник
- **Логи:** `/tmp/serp-monitor-weekly.log`

✅ **`scripts/serp-ctr-monitor-positions.sh`** — проверка позиций
- Текущие позиции 5 целевых ключевых слов
- Топ-10 ключевых слов
- Подсвечивает если в TOP-3 ✅
- **Запуск:** 08:15 MSK (вторник–четверг)
- **Логи:** `/tmp/serp-monitor-positions.log`

### 3️⃣ Автоматизация
✅ **Crontab настроена:**
```crontab
7 9 * * * /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-daily.sh >> /tmp/serp-monitor-daily.log 2>&1
13 10 * * 1 /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-weekly.sh >> /tmp/serp-monitor-weekly.log 2>&1
15 8 * * 2-4 /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-positions.sh >> /tmp/serp-monitor-positions.log 2>&1
```

### 4️⃣ Инструкции
✅ **`scripts/SERP-MONITOR-README.md`**
- Как работает каждый скрипт
- Как читать результаты
- Критерии для ALERT/REVERT
- Troubleshooting

---

## 🎯 Целевые ключевые слова (напоминание)

| Ключевое слово | Спрос | Текущая поз. | Целевая поз. | Страница |
|---|---|---|---|---|
| летний лагерь для детей | 109 | — | 1–3 | index.astro ✅ |
| лагерь детский | 146 | 4.6 | 1–3 | detskiy-lager.astro ✅ |
| летний детский лагерь | 125 | — | 1–3 | lager-v-podmoskove.astro ✅ |
| лагерь в подмосковье | 146 | 4.4 | 1–3 | detskiy-lager-podmoskove.astro ✅ |
| лагерь для подростков | 100 | — | 1–3 | lager-dlya-podrostkov.astro ✅ |

---

## 📊 Как проверить что всё работает

### Вариант 1: Запустить скрипты вручную
```bash
# Daily check
./scripts/serp-ctr-monitor-daily.sh

# Weekly report
./scripts/serp-ctr-monitor-weekly.sh

# Position check
./scripts/serp-ctr-monitor-positions.sh
```

### Вариант 2: Проверить логи
```bash
# Посмотреть что было в прошлый день
tail -30 /tmp/serp-monitor-daily.log
tail -20 /tmp/serp-monitor-weekly.log
tail -30 /tmp/serp-monitor-positions.log
```

### Вариант 3: Проверить crontab
```bash
crontab -l | grep serp
```

---

## ⏰ График мониторинга

### День 1–3 (острая реакция)
- ✅ Daily check (09:07): CTR, bounce rate, трафик
- ✅ Ищем ALERTS: CTR ↓15%+, bounce rate ↑

### День 4–7 (адаптация)
- ✅ Daily check: продолжаем монитор
- ✅ Position check (вт–чт): отслеживаем дроп/восстановление позиций
- ✅ Готовимся к еженедельному отчету

### День 8–14 (итоги)
- ✅ Weekly report (пн 10:13): сравнение ДО vs ПОСЛЕ
- ✅ Анализируем результаты
- ✅ Решаем: продолжить оптимизацию или откатить?

---

## 🚨 Когда что-то пошло не так?

### Критический дроп CTR (>15%) или конверсий (>30%)

**Откатить немедленно:**
```bash
cd /Users/vladimirafanasev/Aidacamp-cloude
git revert 9a52afcc --no-edit
git push origin dev
```

**Потом:** Дождаться переиндексации (12–24 часа), проанализировать почему не сработало.

### Позиции упали на 2–3 места

**Это нормально!** Дождаться дня 7. Обычно восстанавливаются.

**Если после дня 7 не восстановились:** Проверить что новый title соответствует контенту на странице, может быть нужно обновить content.

### Bounce rate зашкалил (avg session < 0:45)

**Причина:** Люди кликают по сниппету, но контент на странице его не поддерживает.

**Решение:** Обновить h1, первый параграф, value propositions на странице, чтобы сразу было видно что обещает title.

---

## 📝 Дополнительно

### Где мониторить в реальном времени?
- **CTR + позиции:** Яндекс.Вебмастер (https://webmaster.yandex.ru/)
- **Трафик:** Метрика (https://metrica.yandex.ru/)
- **Bounce rate:** Clarity (https://clarity.microsoft.com/)
- **Goal 541048270:** Метрика → Цели

### Кто получает уведомления?
- Логи скриптов копятся в `/tmp/serp-monitor-*.log`
- Еженедельные отчеты добавляются в `SERP-CTR-optimization-2026-05.md`
- ALERTS выводятся в stdout (если запустить вручную)

---

## ✨ Итого

| Компонент | Статус | Примечание |
|-----------|--------|-----------|
| **Документация** | ✅ | Полная история проекта в `_notes/` |
| **Daily скрипт** | ✅ | 09:07 MSK каждый день |
| **Weekly скрипт** | ✅ | 10:13 MSK по понедельникам |
| **Position скрипт** | ✅ | 08:15 MSK вт–чт |
| **Crontab** | ✅ | Все 3 job'а в crontab |
| **Логи** | ✅ | `/tmp/serp-monitor-*.log` |
| **Инструкции** | ✅ | `SERP-MONITOR-README.md` |
| **Откат** | ✅ | `git revert 9a52afcc` готов |

---

**Дальше:** Ждём результатов! За 7–14 дней станет ясно работает ли оптимизация. Скрипты будут присылать отчеты каждый день/неделю.

---

**Обновлено:** 2026-05-04 14:30 MSK
