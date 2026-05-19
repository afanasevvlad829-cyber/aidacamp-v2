#!/bin/bash
# SEO Auto-Improve: читает план с сервера, улучшает топ-2 страницы, деплоит на dev, шлёт TG
# Cron: 30 9 * * 2 (вторник 9:30 — после того как seo_advisor.py отработал в 8:00)
set -e

REPO_DIR="/Users/vladimirafanasev/Aidacamp-cloude"
SSH_KEY="$HOME/.ssh/aidacamp_prod"
SERVER="root@159.194.223.55"
PLANS_DIR="/opt/seo-etl/plans"
LOG="$REPO_DIR/logs/seo-auto-improve.log"
TG_BOT="8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT="244314247"
CLAUDE_BIN="$HOME/.local/bin/claude"

mkdir -p "$REPO_DIR/logs"
exec >> "$LOG" 2>&1
echo ""
echo "=== SEO Auto-Improve $(date '+%Y-%m-%d %H:%M:%S') ==="

# --- Утилиты ---

tg() {
  local text="$1"
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TG_CHAT}\",\"text\":$(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"HTML\"}" > /dev/null
}

tg_with_buttons() {
  local text="$1"
  local buttons="$2"
  curl -s -X POST "https://api.telegram.org/bot${TG_BOT}/sendMessage" \
    -H "Content-Type: application/json" \
    -d "{\"chat_id\":\"${TG_CHAT}\",\"text\":$(echo "$text" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),\"parse_mode\":\"HTML\",\"reply_markup\":{\"keyboard\":${buttons},\"one_time_keyboard\":true,\"resize_keyboard\":true}}" > /dev/null
}

# Перевод URL → путь к .astro файлу
url_to_astro() {
  local url="$1"
  local base="$REPO_DIR/src/pages"
  # Убрать ведущий слэш
  local slug="${url#/}"

  if [ -z "$slug" ]; then
    echo "$base/index.astro"
  elif [ -f "$base/${slug}.astro" ]; then
    echo "$base/${slug}.astro"
  elif [ -f "$base/blog/${slug}.astro" ]; then
    echo "$base/blog/${slug}.astro"
  elif [ -f "$base/stati/${slug}.astro" ]; then
    echo "$base/stati/${slug}.astro"
  else
    # Попробовать поиск
    find "$base" -name "${slug##*/}.astro" 2>/dev/null | head -1
  fi
}

# --- Шаг 1: Скачать последний план с сервера ---

echo "[1] Скачиваем план с сервера..."
LATEST_PLAN=$(ssh -i "$SSH_KEY" "$SERVER" "ls -t $PLANS_DIR/plan_*.json 2>/dev/null | head -1")
if [ -z "$LATEST_PLAN" ]; then
  echo "Планов нет на сервере, выходим"
  tg "⚠️ SEO Auto-Improve: план не найден на сервере"
  exit 0
fi

PLAN_DATE=$(basename "$LATEST_PLAN" | sed 's/plan_//;s/.json//')
LOCAL_PLAN="/tmp/seo_plan_${PLAN_DATE}.json"
scp -q -i "$SSH_KEY" "${SERVER}:${LATEST_PLAN}" "$LOCAL_PLAN"
echo "Скачан план: $PLAN_DATE"

# Проверить свежесть — не старше 2 дней
PLAN_AGE_DAYS=$(python3 -c "
from datetime import date, datetime
d = datetime.strptime('$PLAN_DATE', '%Y-%m-%d').date()
print((date.today() - d).days)
")
if [ "$PLAN_AGE_DAYS" -gt 2 ]; then
  echo "План старый ($PLAN_AGE_DAYS дней), пропускаем"
  tg "⚠️ SEO: последний план от $PLAN_DATE (${PLAN_AGE_DAYS}д назад), пропускаем автоулучшение"
  exit 0
fi

# --- Шаг 2: Извлечь топ-2 контентных действия ---

echo "[2] Извлекаем действия из плана..."
ACTIONS=$(python3 - << PYEOF
import json
with open('$LOCAL_PLAN') as f:
    data = json.load(f)
plan = data.get('plan', data)
actions = plan.get('actions', [])
# Берём топ-2 которые требуют контентных правок
content_types = {'quick_win', 'content', 'drop_recovery'}
result = [a for a in actions if a.get('type') in content_types and a.get('page')][:2]
for a in result:
    print(f"{a['page']}|{a.get('keyword','?')}|{a.get('volume',0)}|{a.get('problem','?')}|{a.get('action','?')}|{a.get('tool','improve-content')}")
PYEOF
)

if [ -z "$ACTIONS" ]; then
  echo "Нет контентных действий в плане, выходим"
  tg "ℹ️ SEO план $PLAN_DATE: контентных задач нет, только технические — смотри Reports Hub"
  exit 0
fi

WEEK_PRIORITY=$(python3 -c "
import json
with open('$LOCAL_PLAN') as f: d = json.load(f)
print(d.get('plan', d).get('week_priority',''))
")

echo "Действий для улучшения: $(echo "$ACTIONS" | wc -l | tr -d ' ')"
tg "🤖 <b>SEO Auto-Improve запущен</b>
Неделя: $PLAN_DATE
Фокус: $WEEK_PRIORITY

Улучшаю $(echo "$ACTIONS" | wc -l | tr -d ' ') страницы..."

# --- Шаг 3: Улучшить каждую страницу ---

cd "$REPO_DIR"
IMPROVED_PAGES=""
IMPROVE_ERRORS=""

while IFS='|' read -r url keyword volume problem action tool; do
  [ -z "$url" ] && continue
  echo ""
  echo "[3] Улучшаю: $url (ключ: $keyword, поз.цель: топ-3)"

  ASTRO_FILE=$(url_to_astro "$url")
  if [ -z "$ASTRO_FILE" ] || [ ! -f "$ASTRO_FILE" ]; then
    echo "  Файл не найден для $url — пропускаем"
    IMPROVE_ERRORS="${IMPROVE_ERRORS}\n• $url — файл не найден"
    continue
  fi

  echo "  Файл: $ASTRO_FILE"

  # Запускаем headless Claude с инструкцией
  PROMPT="Используй скилл improve-content для страницы https://aidacamp.ru${url}.

Контекст SEO:
- Текущая проблема: $problem
- Главный ключ: $keyword (объём ${volume}/мес)
- Требуемое действие: $action
- Файл в репо: $ASTRO_FILE

Требования:
1. Запусти Skill('improve-content') для этой страницы
2. Сохрани улучшенный контент в файл $ASTRO_FILE
3. НЕ деплой — только сохрани файл
4. Выведи в конце: УЛУЧШЕНО: <краткое описание что изменил>"

  IMPROVE_OUTPUT=$("$CLAUDE_BIN" \
    --no-session-persistence \
    --no-chrome \
    --tools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch" \
    --permission-mode bypassPermissions \
    --max-turns 30 \
    -p "$PROMPT" 2>&1)

  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    SUMMARY=$(echo "$IMPROVE_OUTPUT" | grep -o 'УЛУЧШЕНО:.*' | head -1 | sed 's/УЛУЧШЕНО: //')
    echo "  ✅ Улучшено: $SUMMARY"
    IMPROVED_PAGES="${IMPROVED_PAGES}• <code>${url}</code> — ${SUMMARY:-улучшено}\n"
  else
    echo "  ❌ Ошибка (код $EXIT_CODE)"
    IMPROVE_ERRORS="${IMPROVE_ERRORS}\n• $url — ошибка Claude"
  fi

done <<< "$ACTIONS"

# --- Шаг 4: Билд + деплой на dev ---

if [ -z "$IMPROVED_PAGES" ]; then
  tg "❌ <b>SEO Auto-Improve</b>: ни одна страница не улучшена
$IMPROVE_ERRORS"
  exit 1
fi

echo ""
echo "[4] Билд и деплой на dev..."
npm run build >> "$LOG" 2>&1
./scripts/deploy.sh dev >> "$LOG" 2>&1
echo "Задеплоено на dev"

# --- Шаг 5: Сохранить список улучшенных страниц для деплой-листенера ---

echo "$IMPROVED_PAGES" > /tmp/seo_improved_pages.txt
echo "$PLAN_DATE" > /tmp/seo_last_improve_date.txt

# Формируем ссылки на dev для проверки
DEV_LINKS=""
while IFS='|' read -r url rest; do
  [ -z "$url" ] && continue
  DEV_LINKS="${DEV_LINKS}• https://dev.aidacamp.ru${url}\n"
done <<< "$ACTIONS"

# --- Шаг 6: TG с кнопкой одобрения ---

MSG="✅ <b>SEO: страницы улучшены и задеплоены на dev</b>

<b>Что изменено:</b>
${IMPROVED_PAGES}
<b>Проверь на dev:</b>
${DEV_LINKS}
Если всё ок — напиши <b>/deploy_seo</b> и я выкачу в прод."

if [ -n "$IMPROVE_ERRORS" ]; then
  MSG="${MSG}

⚠️ Не удалось улучшить:${IMPROVE_ERRORS}"
fi

tg "$MSG"
echo "TG отправлен"
echo "=== Готово ==="

# Запустить листенер для одобрения деплоя (фоново, живёт 24 часа)
nohup python3 "$REPO_DIR/scripts/seo-deploy-listener.py" >> "$REPO_DIR/logs/seo-deploy-listener.log" 2>&1 &
echo "Deploy listener запущен (PID $!)"
