#!/bin/bash
# seo-scripts-sync.sh — синхронизация /opt/scripts с origin/dev.
#
# Зачем (07.09.2026). /opt/scripts не покрыт CI: deploy.sh шлёт на прод только
# dist/client и dist/server. Скрипты годами выкладывались руками, и это привело
# к дрейфу В ОБЕ СТОРОНЫ — что опаснее одностороннего:
#   * seo-backlog-volumes.mjs на ПРОДЕ был новее репозитория на три боевых фикса
#     (BATCH 100→30 против 429, MAX_PER_RUN, точечный разбор ошибки 422). Выложи
#     кто-нибудь репо-версию — ночной сбор частотности сломался бы той же ночью,
#     молча: «добрано 0, без ответа 4362».
#   * seo-backlog-webmaster.mjs наоборот отставал от репозитория.
# Дрейф вычищен вручную (PR #1912), дальше его держит этот скрипт.
#
# Почему одна точка, а не runtime-pull в каждой строке крона: шесть копий
# `git fetch && git show ... > файл && bash файл` расходятся при первой же
# правке, и никто не заметит. Здесь список файлов в одном месте.
#
# ⚠️ ОТСУТСТВУЮЩИЙ В РЕПО ФАЙЛ НЕ УДАЛЯЕТСЯ. Скрипт только перезаписывает то,
# что есть в origin/dev. Иначе достаточно опечатки в пути, чтобы снести боевой
# скрипт, а восстанавливать было бы неоткуда.

set -uo pipefail

MIRROR="${MIRROR:-/opt/aidacamp-build}"
DEST="${DEST:-/opt/scripts}"
REF="${REF:-origin/dev}"
LOG_PREFIX="[$(date '+%F %T')]"

# <путь в репо>:<имя в /opt/scripts>
FILES=(
  "scripts/seo-backlog-gate.sh:seo-backlog-gate.sh"
  "scripts/seo-backlog-rebuild-weekly.sh:seo-backlog-rebuild-weekly.sh"
  "scripts/seo-backlog-build.mjs:seo-backlog-build.mjs"
  "scripts/seo-backlog-webmaster.mjs:seo-backlog-webmaster.mjs"
  "scripts/seo-backlog-volumes.mjs:seo-backlog-volumes.mjs"
  "scripts/server/seo-wave-watchdog.sh:seo-wave-watchdog.sh"
  "scripts/server/seo-wave-run.sh:seo-wave-run.sh"
  "scripts/server/seo-positions-check.sh:seo-positions-check.sh"
  "scripts/server/seo-alert.sh:seo-alert.sh"
  "scripts/server/seo_weekly_check.mjs:seo_weekly_check.mjs"
)

cd "$MIRROR" || { echo "$LOG_PREFIX зеркало $MIRROR недоступно"; exit 1; }
git fetch -q origin dev || { echo "$LOG_PREFIX git fetch не прошёл"; exit 1; }

changed=0; missing=0
for pair in "${FILES[@]}"; do
  src="${pair%%:*}"; name="${pair##*:}"; dst="$DEST/$name"
  if ! git cat-file -e "$REF:$src" 2>/dev/null; then
    echo "$LOG_PREFIX ПРОПУСК: $src нет в $REF — файл на проде не тронут"
    missing=$((missing+1)); continue
  fi
  tmp="$(mktemp)"
  git show "$REF:$src" > "$tmp" || { echo "$LOG_PREFIX не прочитать $src"; rm -f "$tmp"; continue; }
  if [ -f "$dst" ] && cmp -s "$tmp" "$dst"; then rm -f "$tmp"; continue; fi
  cat "$tmp" > "$dst" && rm -f "$tmp"
  case "$name" in *.sh) chmod +x "$dst";; esac
  echo "$LOG_PREFIX обновлён $name"
  changed=$((changed+1))
done

echo "$LOG_PREFIX готово: обновлено $changed, отсутствует в репо $missing"
if [ "$missing" -gt 0 ] && [ -x /opt/scripts/seo-alert.sh ]; then
  echo "В origin/dev нет $missing из ${#FILES[@]} скриптов — они живут только на проде и не под контролем версий." \
    | /opt/scripts/seo-alert.sh warn scripts-sync "скрипты вне репозитория"
fi
exit 0
