#!/bin/bash
# seo-backlog-rebuild-weekly.sh — еженедельная полная пересборка seo_keyword_backlog:
# свежие позиции Топвизора + Wordstat-частотность (build), затем реальные запросы
# Вебмастера по каждому сайту (webmaster). Перед гейтом (06:50) и волной (07:00).
# Владелец 04.09.2026: обнаружено, что build не пересобирался с 20.08 — очередь 'new'
# высыхала без притока свежих позиций, гейт нечего было промотировать.
set -uo pipefail
cd /opt/scripts

echo "=== $(date -u +%FT%TZ) backlog-build старт ==="
node seo-backlog-build.mjs >> /var/log/seo-backlog-build.log 2>&1
echo "=== $(date -u +%FT%TZ) backlog-build конец ==="

declare -A HOSTS=(
  [aidacamp]="https:aidacamp.ru:443"
  [codims]="https:codims.ru:443"
  [icepartners]="https:icepartners.ru:443"
  [vlad-a]="https:vlad-a.ru:443"
)
for site in "${!HOSTS[@]}"; do
  echo "=== $(date -u +%FT%TZ) backlog-webmaster $site старт ==="
  node seo-backlog-webmaster.mjs "$site" "${HOSTS[$site]}" >> /var/log/seo-backlog-webmaster.log 2>&1
  echo "=== $(date -u +%FT%TZ) backlog-webmaster $site конец ==="
done
echo "=== $(date -u +%FT%TZ) rebuild-weekly ЗАВЕРШЁН ==="
