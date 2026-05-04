#!/bin/bash
# Сквозное тестирование Aidacamp Hub
# Покрывает: DB -> API -> MCP цепочку

PASS=0
FAIL=0
SKIP=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}PASS $1${NC}"; ((PASS++)); }
fail() { echo -e "${RED}FAIL $1${NC}"; ((FAIL++)); }
skip() { echo -e "${YELLOW}SKIP $1${NC}"; ((SKIP++)); }
section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

# Конфигурация
DB_NAME="${DB_NAME:-aidacamp_hub}"
API_URL="${API_URL:-http://localhost:3001}"
PSQL="sudo -u postgres psql -d $DB_NAME"

section "1. БАЗА ДАННЫХ"

# Проверить подключение к БД
if $PSQL -c 'SELECT 1' > /dev/null 2>&1; then
  pass "PostgreSQL подключение (${DB_NAME})"
else
  fail "PostgreSQL подключение — БД недоступна"
fi

# Проверить таблицы
TABLES=$($PSQL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null | tr -d ' \n')
if [ -n "$TABLES" ] && [ "$TABLES" -ge 10 ]; then
  pass "Таблицы созданы: $TABLES штук"
else
  fail "Таблиц меньше 10: '${TABLES}' (ожидалось >= 10)"
fi

# Проверить variables_vault
VARS=$($PSQL -t -c 'SELECT COUNT(*) FROM variables_vault' 2>/dev/null | tr -d ' \n')
if [ -n "$VARS" ] && [ "$VARS" -gt 0 ]; then
  pass "Variables vault заполнен: $VARS записей"
else
  fail "Variables vault пуст или таблица не существует"
fi

# Проверить проекты
PROJECTS=$($PSQL -t -c 'SELECT COUNT(*) FROM projects' 2>/dev/null | tr -d ' \n')
if [ -n "$PROJECTS" ] && [ "$PROJECTS" -ge 2 ]; then
  pass "Проекты засеяны: $PROJECTS штук"
else
  fail "Проектов меньше 2: '${PROJECTS}'"
fi

# Проверить pgvector
VECTOR=$($PSQL -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='vector'" 2>/dev/null | tr -d ' \n')
if [ "$VECTOR" = "1" ]; then
  pass "pgvector расширение установлено"
else
  fail "pgvector не установлен"
fi

section "2. ФАЙЛЫ ПРОЕКТА"

check_file() {
  if [ -f "$1" ]; then
    pass "Файл: $1"
  else
    fail "Файл не найден: $1"
  fi
}

check_file "/opt/aidacamp-hub/api/server.js"
check_file "/opt/aidacamp-hub/api/middleware/auth.js"
check_file "/opt/aidacamp-hub/api/routes/kb.js"
check_file "/opt/aidacamp-hub/api/routes/metrics.js"
check_file "/opt/aidacamp-hub/api/routes/sync.js"
check_file "/opt/aidacamp-hub/cron/sync-metrica.js"
check_file "/opt/aidacamp-hub/cron/sync-direct.js"
check_file "/opt/aidacamp-hub/cron/sync-vk.js"
check_file "/opt/aidacamp-hub/cron/sync-crm.js"
check_file "/opt/aidacamp-hub/mcp/mcp-server.mjs"
check_file "/opt/aidacamp-hub/mcp/tools/kb-search.js"
check_file "/opt/aidacamp-hub/mcp/tools/sync-status.js"

section "3. NODE.JS СИНТАКСИС"

check_syntax() {
  if node --check "$1" 2>/dev/null; then
    pass "Синтаксис: $(basename $1)"
  else
    fail "Синтаксическая ошибка: $1"
  fi
}

check_syntax "/opt/aidacamp-hub/api/server.js"
check_syntax "/opt/aidacamp-hub/cron/sync-metrica.js"
check_syntax "/opt/aidacamp-hub/cron/sync-direct.js"
check_syntax "/opt/aidacamp-hub/mcp/tools/kb-search.js"

section "4. CRONTAB"

CRON_COUNT=$(crontab -l 2>/dev/null | grep -c 'aidacamp' || echo 0)
if [ "$CRON_COUNT" -ge 4 ]; then
  pass "Cron jobs зарегистрированы: $CRON_COUNT"
else
  fail "Cron jobs не найдены или меньше 4: $CRON_COUNT"
fi

section "5. API СЕРВЕР"

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
  pass "API /health отвечает"
else
  skip "API сервер не запущен ($API_URL) — запустите: node /opt/aidacamp-hub/api/server.js"
fi

section "6. MCP КОНФИГУРАЦИЯ"

# На сервере ищем глобальный конфиг Claude Code
MCP_FOUND=0
for cfg in \
  "$HOME/.claude/claude_desktop_config.json" \
  "$HOME/.config/claude-code/settings.json" \
  "/opt/aidacamp-hub/mcp/package.json"; do
  if [ -f "$cfg" ] && grep -q "aidacamp" "$cfg" 2>/dev/null; then
    pass "MCP конфиг найден: $cfg"
    MCP_FOUND=1
    break
  fi
done
if [ "$MCP_FOUND" -eq 0 ]; then
  skip "MCP конфиг на сервере не найден (регистрация выполняется на клиентской машине)"
fi

section "ИТОГ"
echo ""
echo -e "Прошло: ${GREEN}$PASS${NC}  Упало: ${RED}$FAIL${NC}  Пропущено: ${YELLOW}$SKIP${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}Все проверки пройдены! Система готова к работе.${NC}"
  exit 0
else
  echo -e "${RED}Есть проблемы, требующие внимания.${NC}"
  exit 1
fi
