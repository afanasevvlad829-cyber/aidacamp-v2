#!/usr/bin/env bash
# scripts/audit-runner.sh — ночной аудит на сервере
#
# Использование:
#   ./scripts/audit-runner.sh                        # TZ по умолчанию
#   ./scripts/audit-runner.sh /path/to/AUDIT_TZ.md  # другой файл
#   ./scripts/audit-runner.sh --status               # статус запущенного аудита
#   ./scripts/audit-runner.sh --attach               # подключиться к screen
#   ./scripts/audit-runner.sh --log                  # tail лога
#   ./scripts/audit-runner.sh --kill                 # остановить аудит
#
# Мак можно закрыть и выключить — аудит идёт на сервере в screen.

set -euo pipefail

PROJECT_LOCAL="/Users/vladimirafanasev/Aidacamp-cloude"
PROJECT_REMOTE="/tmp/aidacamp-audit"
TZ_DEFAULT="/Users/vladimirafanasev/Downloads/AUDIT_TZ_v1.md"
SERVER="root@159.194.223.55"
SSH_KEY="$HOME/.ssh/aidacamp_prod"
SCREEN_NAME="aidacamp-audit"
REMOTE_LOG="/tmp/audit-run.log"

TG_TOKEN="8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT="244314247"

R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'

ssh_cmd() { ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER" "$@"; }
tg() {
  curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    -d chat_id="${TG_CHAT}" -d parse_mode="HTML" -d text="$1" >/dev/null 2>&1 || true
}

# ── Служебные команды ─────────────────────────────────────────────
case "${1:-}" in
  --status)
    echo "=== Screen сессии на сервере ==="
    ssh_cmd "screen -ls 2>/dev/null || echo 'нет screen сессий'"
    echo ""
    echo "=== Хвост лога ==="
    ssh_cmd "tail -20 $REMOTE_LOG 2>/dev/null || echo 'лог пуст'"
    exit 0 ;;
  --attach)
    echo "Подключаюсь к screen '$SCREEN_NAME' на сервере..."
    ssh -i "$SSH_KEY" -t "$SERVER" "screen -r $SCREEN_NAME"
    exit 0 ;;
  --log)
    echo "tail -f $REMOTE_LOG на сервере (Ctrl+C для выхода):"
    ssh -i "$SSH_KEY" "$SERVER" "tail -f $REMOTE_LOG"
    exit 0 ;;
  --kill)
    echo "Останавливаю аудит на сервере..."
    ssh_cmd "screen -S $SCREEN_NAME -X quit 2>/dev/null && echo 'Остановлено' || echo 'Сессия не найдена'"
    exit 0 ;;
esac

# ── Основной запуск ───────────────────────────────────────────────
TZ_FILE="${1:-$TZ_DEFAULT}"

[ -f "$TZ_FILE" ]         || { echo -e "${R}❌ ТЗ не найдено: $TZ_FILE${N}"; exit 1; }
[ -f "$SSH_KEY" ]         || { echo -e "${R}❌ SSH ключ не найден: $SSH_KEY${N}"; exit 1; }
[ -n "${ANTHROPIC_API_KEY:-}" ] || { echo -e "${R}❌ ANTHROPIC_API_KEY не задан локально${N}"; exit 1; }

GIT_HASH=$(git -C "$PROJECT_LOCAL" rev-parse --short HEAD)
START_DT=$(date '+%Y-%m-%d %H:%M:%S')

echo ""
echo -e "${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${Y}  НОЧНОЙ АУДИТ АЙДАКЕМП — ЗАПУСК НА СЕРВЕРЕ${N}"
echo -e "${Y}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo ""
echo -e "  ТЗ:      ${B}$TZ_FILE${N}"
echo -e "  Сервер:  ${B}$SERVER${N}  →  ${B}$PROJECT_REMOTE${N}"
echo -e "  Лог:     ${B}$REMOTE_LOG${N}"
echo -e "  Screen:  ${B}$SCREEN_NAME${N}"
echo -e "  Hash:    ${B}$GIT_HASH${N}"
echo -e "  Старт:   ${B}$START_DT${N}"
echo ""
echo -e "${G}  После запуска мак можно закрыть — аудит идёт на сервере.${N}"
echo ""

# Проверка — нет ли уже запущенного аудита
if ssh_cmd "screen -ls 2>/dev/null | grep -q $SCREEN_NAME" 2>/dev/null; then
  echo -e "${Y}⚠️  Сессия '$SCREEN_NAME' уже запущена на сервере.${N}"
  echo -e "   Статус:     ${B}./scripts/audit-runner.sh --status${N}"
  echo -e "   Подключить: ${B}./scripts/audit-runner.sh --attach${N}"
  echo -e "   Убить:      ${B}./scripts/audit-runner.sh --kill${N}"
  exit 1
fi

echo -n "Запуск через 3 сек (Ctrl+C для отмены)..."
for i in 3 2 1; do echo -n " $i"; sleep 1; done
echo " Поехали!"
echo ""

# ── Шаг 1: rsync исходников на сервер ────────────────────────────
echo -e "${B}▶ Синхронизирую исходники → $SERVER:$PROJECT_REMOTE${N}"
rsync -az --delete \
  --exclude=".git/" \
  --exclude="node_modules/" \
  --exclude="dist/" \
  --exclude=".cache/" \
  --exclude="*.log" \
  -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
  "$PROJECT_LOCAL/" "$SERVER:$PROJECT_REMOTE/"

echo -e "${G}  ✅ Синхронизация завершена${N}"

# ── Шаг 2: Патч путей в ТЗ и загрузка на сервер ─────────────────
echo -e "${B}▶ Загружаю ТЗ с адаптированными путями${N}"
sed "s|/Users/vladimirafanasev/Aidacamp-cloude|$PROJECT_REMOTE|g" \
  "$TZ_FILE" > /tmp/audit-tz-server.md

scp -i "$SSH_KEY" -q /tmp/audit-tz-server.md "$SERVER:/tmp/audit-tz.md"
rm -f /tmp/audit-tz-server.md
echo -e "${G}  ✅ ТЗ загружено: /tmp/audit-tz.md${N}"

# ── Шаг 3: Подготовить директории на сервере ─────────────────────
ssh_cmd "mkdir -p /tmp/audit/M{01..19}"
echo -e "${G}  ✅ Директории артефактов созданы${N}"

# ── Шаг 4: Запуск в screen на сервере ────────────────────────────
echo -e "${B}▶ Запускаю аудит в screen сессии '$SCREEN_NAME'${N}"

# Передаём ANTHROPIC_API_KEY в окружение сервера
CLAUDE_CMD="ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY} claude -p \"\$(cat /tmp/audit-tz.md)\" \
  --no-session-persistence \
  --tools Bash,Read,Write,Edit,Glob,Grep \
  --max-turns 200 \
  --permission-mode bypassPermissions \
  > $REMOTE_LOG 2>&1"

ssh_cmd "screen -dmS $SCREEN_NAME bash -c '$CLAUDE_CMD; echo EXIT_CODE=\$? >> $REMOTE_LOG'"

# Проверяем что screen запустился
sleep 2
if ssh_cmd "screen -ls 2>/dev/null | grep -q $SCREEN_NAME"; then
  echo -e "${G}  ✅ screen сессия запущена${N}"
else
  echo -e "${R}  ❌ screen сессия не запустилась${N}"
  exit 1
fi

# ── Готово ────────────────────────────────────────────────────────
echo ""
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo -e "${G}  ✅ АУДИТ ЗАПУЩЕН НА СЕРВЕРЕ${N}"
echo -e "${G}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
echo ""
echo -e "  МАК МОЖНО ЗАКРЫТЬ — аудит идёт на $SERVER"
echo ""
echo -e "  Следить за ходом:"
echo -e "    ${B}./scripts/audit-runner.sh --log${N}"
echo ""
echo -e "  Подключиться к screen (интерактивно):"
echo -e "    ${B}./scripts/audit-runner.sh --attach${N}"
echo ""
echo -e "  Статус:"
echo -e "    ${B}./scripts/audit-runner.sh --status${N}"
echo ""
echo -e "  Остановить:"
echo -e "    ${B}./scripts/audit-runner.sh --kill${N}"
echo ""
echo -e "  Отчёт появится на: ${B}https://dev.aidacamp.ru/reports-hub/${N}"
echo ""

tg "🔍 <b>Аудит запущен на сервере</b>

Хэш: <code>$GIT_HASH</code>
Старт: <code>$START_DT</code>
Лог: <code>tail -f $REMOTE_LOG</code> на $SERVER

Следить:
<code>./scripts/audit-runner.sh --log</code>

Мак можно закрыть ✅"
