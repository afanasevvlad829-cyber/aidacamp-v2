#!/bin/bash
# Запуск 5 видимых браузеров с DevTools для Full Portal Audit
# Usage: ./run-visible-audit.sh <runId>

set -e

RUN_ID="${1:-audit-$(date +%s)}"
AUDIT_DIR="/tmp/portal-audit-runs/$RUN_ID"
LOG_FILE="$AUDIT_DIR/audit.log"
STATUS_FILE="$AUDIT_DIR/status.json"
TMUX_SESSION="audit-$RUN_ID"

# Инициализация
mkdir -p "$AUDIT_DIR"
echo "=== Full Portal Audit with Visible Browsers ===" > "$LOG_FILE"
echo "Run ID: $RUN_ID" >> "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"

# Инициализировать статус JSON
cat > "$STATUS_FILE" << 'EOF'
{
  "runId": "RUN_ID_PLACEHOLDER",
  "status": "initializing",
  "agents": [
    {"id": 1, "name": "Code Security", "status": "pending", "progress": 0, "port": 3001},
    {"id": 2, "name": "OAuth Testing", "status": "pending", "progress": 0, "port": 3002},
    {"id": 3, "name": "Performance", "status": "pending", "progress": 0, "port": 3003},
    {"id": 4, "name": "Input Validation", "status": "pending", "progress": 0, "port": 3004},
    {"id": 5, "name": "Database Security", "status": "pending", "progress": 0, "port": 3005}
  ],
  "issues": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "PASSED": 0},
  "logs": []
}
EOF

sed -i "s/RUN_ID_PLACEHOLDER/$RUN_ID/g" "$STATUS_FILE"

echo "[$(date +'%H:%M:%S')] Initialized audit session $RUN_ID" >> "$LOG_FILE"

# Функция для запуска агента в видимом браузере
run_agent_visible() {
  local agent_id=$1
  local agent_name=$2
  local port=$3
  local prompt=$4

  # Обновить статус
  sed -i "s/\"status\": \"pending\"/\"status\": \"running\"/g" "$STATUS_FILE"

  echo "[$(date +'%H:%M:%S')] 🚀 Agent $agent_id ($agent_name) starting on port $port" >> "$LOG_FILE"

  # Запустить Claude agent с браузером (headless браузер + DevTools)
  # В продакшене это будет запущено в tmux сессии с видимым окном
  if command -v tmux &> /dev/null; then
    # Создать новое окно в tmux сессии
    tmux new-window -t "$TMUX_SESSION:$agent_id" -n "agent-$agent_id"

    # Запустить браузер с DevTools включенными
    tmux send-keys -t "$TMUX_SESSION:$agent_id" \
      "cd /opt/browser-agent && \
       DISPLAY=:99 chromium-browser \
         --remote-debugging-port=$((9200 + agent_id)) \
         --disable-blink-features=AutomationControlled \
         --user-data-dir=/tmp/browser-$agent_id \
         http://localhost:$port" C-m

    echo "[$(date +'%H:%M:%S')] 🟢 Agent $agent_id browser window opened in tmux" >> "$LOG_FILE"
  fi

  # Параллельно запустить Claude agent (headless)
  {
    claude -p "$prompt" \
      --no-session-persistence \
      --tools "Bash,Read,Grep,Bash" \
      --max-turns 20 \
      --permission-mode bypassPermissions \
      > "$AUDIT_DIR/agent$agent_id-output.txt" 2>&1

    local exit_code=$?
    if [ $exit_code -eq 0 ]; then
      echo "[$(date +'%H:%M:%S')] ✅ Agent $agent_id completed" >> "$LOG_FILE"
    else
      echo "[$(date +'%H:%M:%S')] ❌ Agent $agent_id failed (exit code: $exit_code)" >> "$LOG_FILE"
    fi
  } &
}

# Создать tmux сессию для браузеров
if command -v tmux &> /dev/null; then
  tmux new-session -d -s "$TMUX_SESSION" -x 200 -y 50
  echo "[$(date +'%H:%M:%S')] 🎬 Created tmux session: $TMUX_SESSION" >> "$LOG_FILE"
fi

# Запустить 5 агентов параллельно

# Agent 1: Code Security
run_agent_visible 1 "Code Security" 3001 "
Проведи Security Code Review портала ai.aidacamp.ru:

ФОКУС НА:
1. DUAL-CABINET БАГ: OAuth + synthetic email → 2 аккаунта для одного юзера
2. Race condition: parallel signup requests → проблемы?
3. Input validation: email, password, name от OAuth
4. CSRF protection: есть ли?
5. JWT: lifetime, refresh механизм

ФАЙЛЫ ДЛЯ ЧТЕНИЯ:
- /opt/aidacamp-portal/backend/open_webui/routers/auths.py
- /opt/aidacamp-portal/backend/open_webui/utils/oauth.py
- /opt/aidacamp-portal/backend/open_webui/config.py

SSH: ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55

ВЫВЕДИ JSON результат:
{
  \"severity\": \"CRITICAL|HIGH|MEDIUM\",
  \"title\": \"...\",
  \"location\": \"file:line\",
  \"description\": \"...\",
  \"reproduction_steps\": \"...\",
  \"fix\": \"...\"
}
"

# Agent 2: OAuth Testing
run_agent_visible 2 "OAuth Testing" 3002 "
Тестируй OAuth provuders на портале:

CHECKS:
1. Telegram OAuth: какой email вернёт? (или пусто?)
2. Google OAuth: email claim + picture
3. GitHub OAuth: login + avatar
4. ENABLE_OAUTH_EMAIL_FALLBACK: включен? (создаёт synthetic email)
5. OAUTH_MERGE_ACCOUNTS_BY_EMAIL: есть?

МЕТОД:
- Используй DevTools Network tab для анализа OAuth запросов
- SSH для проверки конфига: docker exec aistudio-webui env | grep OAUTH
- Тестируй dual-account сценарий: password signup + OAuth

ВЫВЕДИ:
{
  \"provider\": \"telegram|google|github\",
  \"email_returned\": true|false,
  \"synthetic_email_created\": \"...\",
  \"dual_account_possible\": true|false,
  \"risk_level\": \"CRITICAL|HIGH|MEDIUM\"
}
"

# Agent 3: Performance & DOS
run_agent_visible 3 "Performance" 3003 "
Аудит Performance & DOS Protection:

CHECKS:
1. Rate limiting на /signin: работает ли?
2. Brute-force protection: есть ли? Скольько попыток?
3. Query performance: медленные запросы?
4. Lighthouse score: Performance, SEO, Accessibility
5. CAPTCHA: включен ли на формах?

TOOLS:
- /opt/browser-agent/lighthouse.js для Lighthouse audit
- Chrome DevTools Network tab для анализа запросов
- SSH logs для rate limiting проверки

ВЫВЕДИ:
{
  \"rate_limiting\": \"enabled|disabled\",
  \"brute_force_protection\": \"enabled|disabled\",
  \"max_attempts\": 5,
  \"lighthouse_performance\": 72,
  \"dos_risk\": \"HIGH|MEDIUM|LOW\"
}
"

# Agent 4: Input Validation
run_agent_visible 4 "Input Validation" 3004 "
Аудит Input Validation & XSS/SQLi:

ТЕСТ CASES:
1. Email validation:
   - очень длинный (1000+ chars)
   - спец-символы: !@#$%^&*()
   - SQL injection: ' OR '1'='1
   - XSS payload: <img src=x onerror=alert(1)>

2. Password:
   - пусто
   - 1 символ
   - 10000 символов
   - SQL injection попытка

3. Name от OAuth:
   - <script>alert(1)</script>
   - Null bytes: \\x00
   - Unicode: 你好<img src=x>

4. CSRF tokens: проверь наличие на forms

ВЫВЕДИ:
{
  \"field\": \"email\",
  \"test_case\": \"<img src=x onerror=alert(1)>\",
  \"should_reject\": true,
  \"actually_rejects\": true|false,
  \"vulnerability\": \"XSS|SQLi|None\"
}
"

# Agent 5: Database Security
run_agent_visible 5 "Database Security" 3005 "
Аудит Database Security & Data Consistency:

SQL CHECKS:
1. Email uniqueness:
   SELECT COUNT(*) FROM auths WHERE email IN (SELECT email FROM auths GROUP BY email HAVING COUNT(*)>1)

2. OAuth sub uniqueness:
   SELECT * FROM oauth WHERE sub IS NOT NULL GROUP BY sub HAVING COUNT(*)>1

3. Orphaned data:
   SELECT * FROM auths WHERE created_at < NOW() - INTERVAL 5 MINUTES AND oauth_id IS NULL AND password IS NULL

4. Transaction isolation: race condition?

5. Audit logging: логируются ли успешные логины?

SSH COMMAND:
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'docker exec aistudio-webui psql ...'

ВЫВЕДИ:
{
  \"check\": \"duplicate_emails\",
  \"result\": 0,
  \"status\": \"PASS\",
  \"description\": \"No duplicate emails found\"
}
"

# Ждём завершения всех агентов
echo "[$(date +'%H:%M:%S')] ⏳ Waiting for all agents to complete..." >> "$LOG_FILE"
wait

echo "[$(date +'%H:%M:%S')] ✅ All agents completed" >> "$LOG_FILE"

# Обновить статус на завершено
sed -i 's/"status": "running"/"status": "completed"/g' "$STATUS_FILE"

echo "[$(date +'%H:%M:%S')] 🎉 Audit finished!" >> "$LOG_FILE"
echo "Results directory: $AUDIT_DIR"
echo "View audit at: https://dev.aidacamp.ru/admin/portal-audit"

# Если tmux сессия всё ещё активна, показать инструкцию
if tmux has-session -t "$TMUX_SESSION" 2>/dev/null; then
  echo ""
  echo "📺 Browser windows are still open:"
  echo "   tmux attach-session -t $TMUX_SESSION"
  echo ""
  echo "To switch between agent windows:"
  echo "   Ctrl+B, then 1-5 to select agent window"
  echo ""
  echo "Press Ctrl+B, then : and type 'kill-session' to close all windows"
fi
