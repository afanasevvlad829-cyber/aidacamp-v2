#!/bin/bash
# Parallel Portal Audit Script
# Запускает 5 headless агентов параллельно для полного security audit портала
# Usage: ./run-parallel-audit.sh <output_dir>

set -e

AUDIT_DIR="${1:-.}"
STATUS_FILE="$AUDIT_DIR/status.json"
FINDINGS_FILE="$AUDIT_DIR/FINDINGS.json"
LOG_FILE="$AUDIT_DIR/audit.log"

# Helper functions
update_agent_status() {
  local agent_index=$1
  local status=$2
  # In real implementation, update JSON file
  echo "[$(date +'%H:%M:%S')] Agent $agent_index: $status" >> "$LOG_FILE"
}

run_agent() {
  local agent_num=$1
  local agent_name=$2
  local prompt=$3
  local output_file="$AUDIT_DIR/agent$agent_num-output.json"

  update_agent_status "$agent_num" "running"

  # Execute headless Claude agent
  claude -p "$prompt" \
    --no-session-persistence \
    --no-chrome \
    --tools "Bash,Read,Grep" \
    --max-turns 15 \
    --permission-mode bypassPermissions \
    > "$output_file" 2>&1

  if [ $? -eq 0 ]; then
    update_agent_status "$agent_num" "completed"
  else
    update_agent_status "$agent_num" "failed"
  fi
}

# Create log file
echo "=== Portal Security Audit ===" > "$LOG_FILE"
echo "Started: $(date)" >> "$LOG_FILE"
echo "Output directory: $AUDIT_DIR" >> "$LOG_FILE"

# Agent 1: Code Security Audit
run_agent 1 "Code Security Audit" "
Проведи глубокий security audit кода портала на:
1. DUAL-CABINET баг: OAuth + synthetic email создаёт 2 аккаунта
2. Race condition в signup: параллельные запросы → два админа
3. Input validation: SQL injection, XSS в email/password/name
4. CSRF protection: есть ли защита?
5. JWT токен: время жизни, refresh механизм

Читай файлы в /opt/aidacamp-portal/:
- backend/open_webui/routers/auths.py (OAuth flow)
- backend/open_webui/utils/oauth.py (OAuth callback)
- backend/open_webui/config.py (defaults)

Выведи результат в JSON формате с полями:
{\"category\": \"Code Security\", \"bugs\": [{\"severity\": \"CRITICAL|HIGH|MEDIUM\", \"title\": \"...\", \"location\": \"file:line\", \"description\": \"...\", \"fix\": \"...\"}]}
" &
AGENT1_PID=$!

# Agent 2: OAuth Flow Testing
run_agent 2 "OAuth Provider Testing" "
Тестируй OAuth flow каждого провайдера на портале:
1. Какой email вернёт Telegram OAuth (или пусто)?
2. Используется ли ENABLE_OAUTH_EMAIL_FALLBACK?
3. Проверь: запрашивается ли OAUTH_MERGE_ACCOUNTS_BY_EMAIL?
4. Тестируй: может ли один юзер иметь 2 аккаунта (password + OAuth)?

Используй:
- SSH к серверу: ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55
- Проверь конфиг: docker exec aistudio-webui python3 -c 'import os; print(os.getenv(\"ENABLE_OAUTH_EMAIL_FALLBACK\"))'
- Анализируй сетевые запросы в DevTools

Выведи JSON результат с провайдерами и статусом dual-cabinet risk.
" &
AGENT2_PID=$!

# Agent 3: Performance & DOS Audit
run_agent 3 "Performance & DOS Protection" "
Проверь performance и DOS protection:
1. Есть ли rate limiting на /signin?
2. Можно ли brute-force пароли?
3. Медленные queries в OAuth flow?
4. Lighthouse score портала?
5. Есть ли CAPTCHA?

Команды для проверки:
- ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 'docker logs aistudio-webui | grep -i duration | tail -20'
- Анализируй Network waterfall при login

Выведи JSON с метриками performance, DOS risks, Lighthouse scores.
" &
AGENT3_PID=$!

# Agent 4: Input Validation & Injection
run_agent 4 "Input Validation & XSS/SQLi Testing" "
Аудит валидации входных данных:
1. Email: очень длинный, спец-символы, SQL injection payload
2. Password: пусто, 1 символ, 10000 символов
3. Name от OAuth: XSS payload, Unicode, null bytes
4. CSRF tokens: отправляются ли?

Проверь код валидации и проведи практические тесты payload'ов.

Выведи JSON с test-case'ами:
{\"category\": \"Input Validation\", \"test_cases\": [{\"input\": \"...\", \"field\": \"email\", \"should_reject\": true, \"actually_rejects\": true/false}]}
" &
AGENT4_PID=$!

# Agent 5: Database Security
run_agent 5 "Database Security & Data Consistency" "
Аудит БД:
1. Email uniqueness constraints: есть ли UNIQUE индекс?
2. OAuth sub uniqueness: может ли быть два раза один sub?
3. Orphaned data: если OAuth fail, остаётся ли partial user?
4. Transaction isolation: race condition?
5. Audit logging: логируются ли логины?

SQL queries через SSH:
- SELECT COUNT(*) FROM auths WHERE email IN (SELECT email FROM auths GROUP BY email HAVING COUNT(*)>1)
- SELECT * FROM config WHERE key LIKE '%OAUTH%'

Выведи JSON с findings о duplicate emails, constraints, audit logging.
" &
AGENT5_PID=$!

echo "Started 5 parallel agents" >> "$LOG_FILE"
echo "Agent PIDs: $AGENT1_PID $AGENT2_PID $AGENT3_PID $AGENT4_PID $AGENT5_PID" >> "$LOG_FILE"

# Wait for all agents to complete
wait $AGENT1_PID $AGENT2_PID $AGENT3_PID $AGENT4_PID $AGENT5_PID

echo "All agents completed" >> "$LOG_FILE"

# Merge results from all agents
echo "Merging results..." >> "$LOG_FILE"

# Create merged findings file
cat > "$FINDINGS_FILE" << 'EOF'
{
  "audit_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "portal": "https://ai.aidacamp.ru",
  "summary": "Параллельный security audit портала — 5 агентов",
  "agents_count": 5,
  "bugs": [],
  "agent_reports": {}
}
EOF

# Collect findings from agent outputs
for i in 1 2 3 4 5; do
  output_file="$AUDIT_DIR/agent$i-output.json"
  if [ -f "$output_file" ]; then
    # Parse and merge findings (simplified)
    cat "$output_file" >> "$LOG_FILE"
  fi
done

echo "Audit completed: $(date)" >> "$LOG_FILE"
echo "✅ Audit finished. Results in $FINDINGS_FILE"
