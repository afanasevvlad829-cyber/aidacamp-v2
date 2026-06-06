#!/usr/bin/env bash
# vps-start-agent.sh — запускает агента на VPS и стримит результат обратно
# Использование: ./scripts/vps-start-agent.sh "<задача>" ["<детальный бриф>"]
#   $1 — короткое название (идёт в slug/ветку/сессию)
#   $2 — (опц.) полный промпт для агента; если не задан, берётся $1

TASK="${1:-}"

if [[ -z "$TASK" ]]; then
  echo "Использование: $0 \"<задача>\" [\"<детальный бриф>\"]"
  echo ""
  echo "Активные сессии на VPS:"
  ssh aidacamp-prod "tmux ls 2>/dev/null || echo '  нет активных сессий'"
  exit 1
fi

BRIEF="${2:-$TASK}"

TASK_SLUG=$(echo "$TASK" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
SESSION="agent-$TASK_SLUG"
LOG="/root/Aidacamp/logs/agents/${TASK_SLUG}.log"
BRIEF_FILE_REMOTE="/tmp/agent-${TASK_SLUG}.brief"

# Бриф передаём ЧЕРЕЗ ФАЙЛ (не встраиваем в send-keys → нет проблем с кавычками/переносами).
_tmp_brief="$(mktemp)"
printf '%s\n' "$BRIEF" > "$_tmp_brief"
scp -q "$_tmp_brief" "aidacamp-prod:$BRIEF_FILE_REMOTE"
rm -f "$_tmp_brief"

echo ""
echo "🚀 Запускаю агента на VPS..."
echo "   Задача:  $TASK"
echo "   Сессия:  $SESSION"
echo "   Лог:     $LOG"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Подготовка на сервере: создаём лог, запускаем агента в tmux
ssh aidacamp-prod bash << REMOTE
set -e
cd ~/Aidacamp
git pull origin dev -q 2>/dev/null || true
mkdir -p logs/agents

# Если сессия уже есть — убиваем
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Запускаем агента в tmux, stdout пишем в лог
tmux new-session -d -s "$SESSION" \; \
  send-keys -t "$SESSION" "cd ~/Aidacamp && ./scripts/agent-start.sh \"$TASK\" 2>&1 | tee $LOG && WORKTREE_DIR=\$(python3 -c \"import json; d=json.load(open('.agent-registry.json')); a=next(x for x in d['agents'] if x['slug']=='$TASK_SLUG'); print(a['worktree'])\") && cd \$WORKTREE_DIR && claude -p \"\$(cat $BRIEF_FILE_REMOTE)\" --permission-mode bypassPermissions 2>&1 | tee -a $LOG; echo 'AGENT_DONE' >> $LOG" Enter

echo "started"
REMOTE

echo "⏳ Агент запущен, стримлю вывод..."
echo "   (Ctrl+C чтобы отключиться — агент продолжит работать на VPS)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ждём пока лог появится на сервере
sleep 3

# Стримим лог с VPS в реальном времени
# При появлении AGENT_DONE — показываем итог и выходим
ssh aidacamp-prod "tail -f $LOG" | while IFS= read -r line; do
  echo "$line"

  if [[ "$line" == "AGENT_DONE" ]]; then
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Агент завершил работу"
    echo ""

    # Получаем итог с сервера
    ssh aidacamp-prod bash << SUMMARY
# PR ссылка если есть
PR=\$(python3 -c "
import json
try:
  d=json.load(open('/root/Aidacamp/.agent-registry.json'))
  a=next((x for x in d['agents'] if x['slug']=='$TASK_SLUG'),None)
  print(a.get('pr_url','') if a else '')
except: print('')
" 2>/dev/null)

if [[ -n "\$PR" ]]; then
  echo "📎 PR: \$PR"
fi

# Последние 20 строк лога
echo ""
echo "--- Последние шаги агента ---"
tail -20 $LOG | grep -v "^$" | head -15
SUMMARY

    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    # Убиваем tail -f
    kill $(jobs -p) 2>/dev/null
    break
  fi
done

echo ""
echo "Подключиться к сессии вживую:"
echo "  ssh aidacamp-prod \"tmux attach -t $SESSION\""
