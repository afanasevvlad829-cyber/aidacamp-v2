# ETL-скрипты на сервере

Скрипты живут на продакшен-сервере в `/opt/etl/`. В репозитории — копия для git-истории и ревью. Сервер — source of truth для executable-версии, репо — для track изменений.

## seo-positions-snapshot.py

**Что делает:** раз в 2 недели (1 и 15 числа) снимает позиции всех ключей из Яндекс.Вебмастер + Google Search Console, пишет в PostgreSQL.

**Cron:**
```cron
0 7 1,15 * * sudo -u postgres python3 /opt/etl/seo-positions-snapshot.py >> /var/log/seo-positions.log 2>&1
```

**Таблица `seo_position_snapshots`** (создаётся автоматически):
```
id · snapshot_date · keyword · search_engine (yandex|google)
position · clicks · impressions · ctr · created_at
UNIQUE (snapshot_date, keyword, search_engine)
```

**Зависимости:**
- `/opt/etl/.env` — `DIRECT_TOKEN` (для YM Webmaster scope), `GSC_CREDENTIALS_PATH=/opt/etl/gsc-sa.json`, `DB_DSN`
- `/opt/etl/gsc-sa.json` — service account JSON для GSC (чтение). Owner `root:postgres`, mode `640`
- Python: `psycopg2`, `google-auth`, `requests`

**Usage:**
```bash
# Обычный прогон (записывает в БД)
sudo -u postgres python3 /opt/etl/seo-positions-snapshot.py

# Без записи — для проверки
sudo -u postgres python3 /opt/etl/seo-positions-snapshot.py --dry-run

# Окно: по умолчанию 14 дней YM / 28 дней GSC
sudo -u postgres python3 /opt/etl/seo-positions-snapshot.py --days 30 --gsc-days 90
```

**Эффект:**
- `seo_position_snapshots` — полная история для построения графиков динамики позиций
- `seo_keywords.position` + `snapshot_date` — обновляется последним значением (удобно для быстрых отчётов без истории)

**Запросы для анализа:**
```sql
-- Динамика позиции по ключу (Yandex)
SELECT snapshot_date, position, impressions
FROM seo_position_snapshots
WHERE keyword = 'летний лагерь для подростков' AND search_engine = 'yandex'
ORDER BY snapshot_date DESC LIMIT 10;

-- Выросли в топ-10 за последний snapshot (Google)
SELECT s1.keyword, s2.position AS prev_pos, s1.position AS now_pos
FROM seo_position_snapshots s1
LEFT JOIN seo_position_snapshots s2 ON s2.keyword=s1.keyword AND s2.search_engine='google'
WHERE s1.search_engine='google' AND s1.snapshot_date = CURRENT_DATE
  AND s1.position <= 10 AND (s2.position > 10 OR s2.position IS NULL)
  AND s2.snapshot_date = (SELECT MAX(snapshot_date) FROM seo_position_snapshots
                          WHERE snapshot_date < s1.snapshot_date);
```

## Деплой после изменений

Скрипт редактируется в репо, затем заливается на сервер:

```bash
scp -i ~/.ssh/aidacamp_prod scripts/etl/seo-positions-snapshot.py root@159.194.223.55:/opt/etl/
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'chmod +x /opt/etl/seo-positions-snapshot.py'
```

Владелец/главный Claude может сразу же запустить ручной прогон для проверки.
