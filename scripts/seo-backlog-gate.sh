#!/bin/bash
# seo-backlog-gate.sh — порог ценности бэклога. Запускать ПОСЛЕ любой загрузки
# (seo-backlog-build / -webmaster / -volumes), до того как конвейер возьмёт задачи.
#
# Зачем (24.08.2026). Полная выгрузка Вебмастера дала 5078 ключей в зоне 11-30, и это
# выглядело как резерв работы. Разбор частотности показал обратное: 4754 из них (94%)
# имеют <10 показов И <100 частотности — это длинный хвост случайных формулировок,
# по которым сайт мелькнул раз-другой. У aidacamp средний показ на ключ = 1,9;
# все 1654 ключа вместе давали 3114 показов — меньше, чем одна страница /math-ege/
# у codims (1858). Гонять конвейер по такому — сжигать ресурс и рисковать правками
# там, где выигрывать нечего.
#
# Решение владельца: слабые ключи из базы НЕ удаляем (они будут появляться и расти),
# но в работу не берём — status='parked'. Конвейер выбирает только status='new'.
#
# Порог двусторонний и самокорректирующийся: ключ поднимается обратно в 'new', если
# показы или частотность выросли. Поэтому скрипт безопасно гонять повторно.
#
# Пороги (переопределяются переменными окружения):
#   MIN_IMPRESSIONS=10  — реальные показы за период Вебмастера
#   MIN_VOLUME=100      — базовая частотность Wordstat в месяц (~1200/год)
# Хватает любого из двух: «нас уже показывают» ИЛИ «спрос есть, но мы невидимы».

set -euo pipefail

PG="${SEO_PG:-postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp}"
MIN_IMPRESSIONS="${MIN_IMPRESSIONS:-10}"
MIN_VOLUME="${MIN_VOLUME:-100}"

psql "$PG" -v ON_ERROR_STOP=1 <<SQL
\set imp $MIN_IMPRESSIONS
\set vol $MIN_VOLUME

-- в отложенные: не дотягивает ни по показам, ни по частотности
UPDATE seo_keyword_backlog SET status='parked', updated_at=now()
 WHERE status='new'
   AND COALESCE(impressions,0) < :imp
   AND COALESCE(volume,0)      < :vol;

-- обратно в работу: спрос подрос (сезон, новая выгрузка, добор частотности)
UPDATE seo_keyword_backlog SET status='new', updated_at=now()
 WHERE status='parked'
   AND (COALESCE(impressions,0) >= :imp OR COALESCE(volume,0) >= :vol);

SELECT site,
       COUNT(*) FILTER (WHERE status='new')    AS в_работе,
       COUNT(*) FILTER (WHERE status='parked') AS отложено,
       COUNT(*) FILTER (WHERE status='done')   AS сделано
  FROM seo_keyword_backlog GROUP BY site ORDER BY site;
SQL
