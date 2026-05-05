# SERP CTR Optimization Monitoring

Автоматический мониторинг результатов SERP-оптимизации (PR #209).

## 📋 Скрипты

### 1. `serp-ctr-monitor-daily.sh`
**Что:** Ежедневная проверка метрик  
**Когда:** Каждый день в 09:07 MSK  
**Проверяет:**
- CTR (Яндекс.Вебмастер)
- Bounce rate (Clarity)
- Органический трафик (Метрика)
- Конверсии (Goal 541048270)

**Выход:** Таблица с текущими значениями + ALERTS если что-то упало >15%

### 2. `serp-ctr-monitor-weekly.sh`
**Что:** Еженедельный сравнительный отчёт  
**Когда:** Каждый понедельник в 10:13 MSK  
**Сравнивает:**
- CTR: неделя ДО vs неделя ПОСЛЕ оптимизации
- Позиции целевых ключевых слов
- Конверсии по Goal 541048270
- Bounce rate

**Выход:** Summary table с % изменений, сохраняется в `_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md`

### 3. `serp-ctr-monitor-positions.sh`
**Что:** Проверка позиций целевых ключевых слов  
**Когда:** Вторник–четверг в 08:15 MSK  
**Отслеживает:**
- Позиции 5 целевых ключевых слов
- Топ-10 ключевых слов в целом
- Подсвечивает целевые ключи если они в TOP-3

**Выход:** Список позиций с цветной подсветкой (зелёный = на целевой позиции, жёлтый = нужно улучшить)

---

## 🚀 Установка (добавить в crontab)

### Шаг 1: Сделай скрипты исполняемыми
```bash
chmod +x /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-*.sh
```

### Шаг 2: Добавь в crontab
```bash
crontab -e
```

### Шаг 3: Вставь эти строки
```crontab
# SERP CTR Optimization Monitoring

# Daily check at 09:07 MSK
7 9 * * * /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-daily.sh >> /tmp/serp-monitor-daily.log 2>&1

# Weekly report every Monday at 10:13 MSK
13 10 * * 1 /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-weekly.sh >> /tmp/serp-monitor-weekly.log 2>&1

# Position check Tue–Thu at 08:15 MSK
15 8 * * 2-4 /Users/vladimirafanasev/Aidacamp-cloude/scripts/serp-ctr-monitor-positions.sh >> /tmp/serp-monitor-positions.log 2>&1
```

### Шаг 4: Проверь что работает
```bash
# Запусти вручную один раз
./scripts/serp-ctr-monitor-daily.sh

# Посмотри что выдалось
cat /tmp/serp-monitor-daily.log
```

---

## ✅ Критерии для ALERT/REVERT

### 🚨 CRITICAL — откатить сниппеты немедленно

| Метрика | Порог | Действие |
|---------|-------|----------|
| CTR ↓ | >15% | Откатить commit 9a52afcc |
| Конверсии ↓ | >30% | Откатить commit 9a52afcc |
| Bounce rate ↑ | avg session < 0:45 | Обновить content, если сниппет неправильно |

### ⚠️ WARNING — мониторить внимательнее

| Метрика | Порог | Действие |
|---------|-------|----------|
| CTR ↓ | 5–15% | Дождаться дня 7, может восстановиться |
| Позиция ↓ | -2 места | Нормально (обычно восстанавливается дни 7–14) |
| Bounce rate ↑ | avg session 0:45–1:30 | Проверить, соответствует ли content sniippet'у |

### ✅ SUCCESS — continue monitoring

| Метрика | Индикатор | Статус |
|---------|-----------|--------|
| CTR ↑ | >10% | 🎉 Отлично! Продолжать |
| Позиция ↑ | движение в TOP-3 | 🎉 Цель достигнута |
| Конверсии → | ±10% | ✅ OK |

---

## 📊 Как читать результаты

### Daily Check Output

```
==========================================
🔍 SERP CTR Daily Check — 2026-05-05
==========================================

1. CTR (Yandex Webmaster)
Current CTR: 4.8%          ← Сравни с baseline (было ~4.2%)

2. Bounce Rate (Clarity)
Monitoring 5 target pages...
⚠️  Clarity data requires authentication

3. Organic Traffic (Metrika)
Organic traffic yesterday:
...

4. Conversions (Goal 541048270)
...

5. Summary & Alerts
✅ No critical alerts. Continue monitoring.
```

**Читаем как:** CTR 4.8% vs baseline 4.2% = +0.6% (OK, не критично)

### Weekly Report Output

```
| Metric | Before | After | Change | Status |
|--------|--------|-------|--------|--------|
| CTR | 4.1% | 4.8% | +17.1% | ✅ WIN |
| Conversions | 12 | 15 | +25% | ✅ GOOD |
```

**Читаем как:** CTR вырос на 17% — отлично! Продолжать мониторить.

### Position Check Output

```
📍 Ranking Position Check — 2026-05-07

Target Keywords Positions:

летний лагерь для детей: Position 3 ✅
лагерь детский: Position 5.2 ⏳ (target for optimization)
летний детский лагерь: Position 2 ✅
```

**Читаем как:** "летний лагерь для детей" достигла TOP-3! ✅ Цель достигнута.

---

## 🔧 Troubleshooting

### "YANDEX_WEBMASTER_TOKEN not found"
```bash
# Добавь токен в ~/.env
grep YANDEX_WEBMASTER_TOKEN ~/.env

# Если нет — положи его там:
echo "YANDEX_WEBMASTER_TOKEN=YOUR_TOKEN" >> ~/.env
```

### "Could not fetch CTR from Webmaster API"
- Проверь интернет соединение
- Проверь что токен актуален (не истёк)
- Проверь что host правильный: `https:aidacamp.ru:443`

### Скрипт не запускается из crontab
```bash
# Сделай скрипт исполняемым
chmod +x scripts/serp-ctr-monitor-*.sh

# Проверь что crontab валидный
crontab -l | grep serp

# Проверь логи
tail -20 /tmp/serp-monitor-daily.log
```

---

## 📞 Контакты

**Документация:** `_notes/SEO-проекты/SERP-CTR-optimization-2026-05.md`  
**Логи:** `/tmp/serp-monitor-*.log`  
**PR:** #209

---

**Обновлено:** 2026-05-04
