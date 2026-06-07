#!/usr/bin/env bash
# 🚫 DEPRECATED 2026-06-06 — небезопасный root-стек (агент под root на проде).
# Заменён изолированными контейнерами: ./scripts/agent-docker.sh "<задача>" "<бриф>"
# Подробности: docker/agent/README.md, DEV_PROTOCOL.md → «Правило №1».
if [ "${ALLOW_DEPRECATED:-0}" != "1" ]; then
  echo "🚫 $(basename "$0") DEPRECATED и небезопасен. Используй: ./scripts/agent-docker.sh \"<задача>\" \"<бриф>\"" >&2
  echo "   (старое поведение на свой риск: ALLOW_DEPRECATED=1 $0 ...)" >&2
  exit 1
fi
# vps-status.sh — статус агентов на VPS
# Использование: ./scripts/vps-status.sh

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          VPS Agent Status                            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

ssh aidacamp-prod "
  echo '--- tmux сессии ---'
  tmux ls 2>/dev/null || echo '  нет активных сессий'
  echo ''
  echo '--- pm2 ---'
  pm2 list 2>/dev/null
  echo ''
  echo '--- heartbeats ---'
  python3 - << 'PYEOF'
import json, os, glob, time
hb_dir = os.path.expanduser('~/Aidacamp/logs/agent-heartbeats')
now = int(time.time())
files = glob.glob(os.path.join(hb_dir, '*.json'))
if not files:
    print('  нет heartbeat файлов')
else:
    for f in files:
        try:
            d = json.load(open(f))
            delta = now - d.get('epoch', 0)
            slug = d.get('agent','?')
            step = d.get('step','?')
            if delta > 240: icon = '🔴'
            elif delta > 120: icon = '🟡'
            else: icon = '🟢'
            print(f'  {icon} {slug} — {delta}s ago — {step}')
        except: pass
PYEOF
  echo ''
  echo '--- последние логи ---'
  ls -lt ~/Aidacamp/logs/agents/*.log 2>/dev/null | head -5 || echo '  нет логов'
"
