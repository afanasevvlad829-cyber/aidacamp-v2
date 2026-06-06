#!/usr/bin/env bash
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
