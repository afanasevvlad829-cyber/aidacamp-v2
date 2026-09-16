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
#
# ⚠️ ПОСТРАНИЧНОЕ ИСКЛЮЧЕНИЕ (06.09.2026). Порог считает ценность ПОКЛЮЧЕВО, а
# конвейер работает ПОСТРАНИЧНО: единица волны — страница со всем её кластером,
# одна правка закрывает сразу все ключи страницы. Из-за расхождения единиц порог
# запер работу, которой не видел: на codims 1888 ключей стояли на позициях 11-20
# (шаг до ТОП-10) и все были в parked, потому что поштучно каждый микрочастотный —
# в среднем 5 частотности и 1-2 показа. Кустами они складывались в 22 страницы,
# включая ВСЕ продающие: /courses/python/, /courses/blender/, /courses/animation/,
# /courses/design/, /ege/, /math-ege/. Одна /stati/kak-sdelat-v-roblox-studio/
# держала 611 таких ключей и 815 показов. Конвейер семь прогонов подряд
# заканчивал вхолостую с диагнозом «нет недожатых страниц» — при полном складе.
#
# Поэтому ключ в полосе 11-20 НЕ паркуется, если его страница как целое несёт
# ощутимый спрос. Полоса узкая намеренно: это зона, где до ТОП-10 два-три шага,
# а не весь хвост страницы.
#   PAGE_MIN_IMPRESSIONS=20 / PAGE_MIN_VOLUME=150 — совокупно по странице
#   PAGE_BAND_LO=11 / PAGE_BAND_HI=20             — полоса «шаг до ТОП-10»
# Главная исключена: она чемпион, её разгружает фронт C, а не фронт A.

set -euo pipefail

PG="${SEO_PG:-postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp}"
MIN_IMPRESSIONS="${MIN_IMPRESSIONS:-10}"
MIN_VOLUME="${MIN_VOLUME:-100}"
PAGE_MIN_IMPRESSIONS="${PAGE_MIN_IMPRESSIONS:-20}"
PAGE_MIN_VOLUME="${PAGE_MIN_VOLUME:-150}"
PAGE_BAND_LO="${PAGE_BAND_LO:-11}"
PAGE_BAND_HI="${PAGE_BAND_HI:-20}"

psql "$PG" -v ON_ERROR_STOP=1 <<SQL
\set imp $MIN_IMPRESSIONS
\set vol $MIN_VOLUME
\set pimp $PAGE_MIN_IMPRESSIONS
\set pvol $PAGE_MIN_VOLUME
\set blo $PAGE_BAND_LO
\set bhi $PAGE_BAND_HI

-- Страницы-кусты: в полосе «шаг до ТОП-10» несут ощутимый спрос СОВОКУПНО.
-- Их ключи в этой полосе порог не трогает — это цели волн фронта A.
CREATE TEMP VIEW strong_pages AS
SELECT site, cluster_page
  FROM seo_keyword_backlog
 WHERE position BETWEEN :blo AND :bhi
   AND cluster_page IS NOT NULL
   AND cluster_page !~ '^https?://[^/]+/?\$'   -- главная: фронт C, не фронт A
   AND cluster_page !~ '^/\$'
 GROUP BY site, cluster_page
HAVING SUM(COALESCE(impressions,0)) >= :pimp OR SUM(COALESCE(volume,0)) >= :pvol;

-- в отложенные: не дотягивает ни по показам, ни по частотности.
-- ⚠️ СЕЗОННЫЕ КЛЮЧИ ИСКЛЮЧЕНЫ ИЗ ПОРОГА (владелец 25.08.2026).
-- Порог смотрит на ТЕКУЩИЙ спрос, а сезонный запрос по определению спит вне
-- своего окна: у «лагерь на осенние каникулы» в конце августа 2 показа, и первая
-- версия порога отправила его в parked — то есть отсекла ровно то, что нужно
-- готовить ЗАРАНЕЕ. Позиции под осенние смены и раннее бронирование лета
-- набираются за месяцы до спроса, а не когда он уже пришёл.
UPDATE seo_keyword_backlog SET status='parked', updated_at=now()
 WHERE status='new'
   AND COALESCE(impressions,0) < :imp
   AND COALESCE(volume,0)      < :vol
   AND keyword !~* 'осен|каникул|октябр|ноябр|декабр|зимн|новогодн|весенн|март|февральск|ранн(ее|его) бронирован'
   AND NOT (position BETWEEN :blo AND :bhi
            AND (site, cluster_page) IN (SELECT site, cluster_page FROM strong_pages));

-- обратно в работу: спрос подрос (сезон, новая выгрузка, добор частотности)
-- либо ключ сезонный и попал в parked прежней версией порога.
UPDATE seo_keyword_backlog SET status='new', updated_at=now()
 WHERE status='parked'
   AND (COALESCE(impressions,0) >= :imp OR COALESCE(volume,0) >= :vol
        OR (keyword ~* 'осен|каникул|октябр|ноябр|декабр|зимн|новогодн|весенн|март|февральск|ранн(ее|его) бронирован'
            AND COALESCE(position,101) BETWEEN 11 AND 50)
        OR (position BETWEEN :blo AND :bhi
            AND (site, cluster_page) IN (SELECT site, cluster_page FROM strong_pages)));

SELECT site,
       COUNT(*) FILTER (WHERE status='new')    AS в_работе,
       COUNT(*) FILTER (WHERE status='parked') AS отложено,
       COUNT(*) FILTER (WHERE status='done')   AS сделано
  FROM seo_keyword_backlog GROUP BY site ORDER BY site;
SQL
