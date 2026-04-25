#!/bin/bash
# sync-camp-data.sh — синхронизирует данные смен с aidacamp.ru
# Запускается cron на сервере ежедневно в 7:00 МСК
# Скрапит сайт → обновляет /var/www/aidacamp-data/shifts.json → перезапускает сервер

set -e

REPO="/root/Aidacamp-cloude"
DATA_DIR="/var/www/aidacamp-data"
SHIFTS_FILE="$DATA_DIR/shifts.json"
LOG="/var/log/aidacamp-sync.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Старт синхронизации ==="

mkdir -p "$DATA_DIR"

# Скрапим сайт и парсим смены
node /opt/browser-agent/scrape.js 'https://aidacamp.ru' text 2>/dev/null | python3 -c "
import sys, re, json

text = sys.stdin.read()

# Парсим все смены из текста
shifts = []
pattern = r'(Смена \d+(?:\.\d+)?)\s+(\d+ \w+ — \d+ \w+)\s+(?:короткая|места есть|популярная)?\s*(\d+) дней.*?(\d[\s\d]*[\d]) ₽.*?занято (\d+)\s+свободно (\d+)'
for m in re.finditer(pattern, text, re.DOTALL):
    name = m.group(1).strip()
    dates = m.group(2).strip()
    days = int(m.group(3).strip())
    price = int(re.sub(r'\s+', '', m.group(4).strip()))
    occupied = int(m.group(5).strip())
    free = int(m.group(6).strip())
    total = occupied + free
    popular = 'Популярная' in text[max(0,m.start()-100):m.start()+50]
    short = 'короткая' in text[max(0,m.start()-100):m.start()+50]
    shifts.append({
        'id': 'smena-' + name.replace('Смена ', '').replace('.', '-').strip(),
        'name': name,
        'dates': dates,
        'days': days,
        'price': price,
        'available': free > 0,
        'popular': popular,
        'short': short,
        'enrolled': occupied,
        'total': total,
    })

# Удаляем дубликаты
seen = set()
uniq = []
for s in shifts:
    if s['id'] not in seen:
        seen.add(s['id'])
        uniq.append(s)

result = {'shifts': uniq, 'updated': '$(date -u +%Y-%m-%dT%H:%M:%SZ)'}
print(json.dumps(result, ensure_ascii=False, indent=2))
" > "$SHIFTS_FILE.tmp" 2>/dev/null

# Проверяем что данные корректны (есть хотя бы 4 смены)
COUNT=$(python3 -c "import json; d=json.load(open('$SHIFTS_FILE.tmp')); print(len(d['shifts']))" 2>/dev/null || echo 0)

if [ "$COUNT" -lt 4 ]; then
  log "ОШИБКА: распарсили только $COUNT смен — откатываем"
  rm -f "$SHIFTS_FILE.tmp"
  exit 1
fi

mv "$SHIFTS_FILE.tmp" "$SHIFTS_FILE"
log "Записано $COUNT смен в $SHIFTS_FILE"

# Перезапускаем SSR-серверы чтобы подхватили новый файл
pm2 restart aidacamp-dev --silent 2>/dev/null || true
pm2 restart aidacamp-prod --silent 2>/dev/null || true

log "=== Готово ==="
