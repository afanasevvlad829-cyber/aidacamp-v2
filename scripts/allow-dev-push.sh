#!/usr/bin/env bash
# allow-dev-push.sh — разрешить Claude Code пушить в ветку dev.
#
# Что делает:
#   1. бэкапит .claude/settings.json
#   2. убирает из массива "deny" правило  Bash(git push origin dev*)
#   3. добавляет в "allow"  Bash(git push origin dev:*)
#   4. проверяет, что JSON остался валидным (иначе откатывает бэкап)
#
# main / --force / -f остаются под запретом — прод не трогаем.
# После запуска ПЕРЕЗАПУСТИ Claude Code, чтобы правило применилось.
#
# Использование:  bash scripts/allow-dev-push.sh

set -euo pipefail
cd "$(dirname "$0")/.."
F=".claude/settings.json"

[ -f "$F" ] || { echo "✖ Не найден $F"; exit 1; }

BAK="$F.bak-$(date +%s)"
cp "$F" "$BAK"
echo "▶ Бэкап: $BAK"

python3 - "$F" <<'PY'
import json, sys
f = sys.argv[1]
data = json.load(open(f, encoding="utf-8"))

DENY_TARGET = "Bash(git push origin dev*)"
ALLOW_RULE  = "Bash(git push origin dev:*)"
removed = 0
allowed = False

def walk(node):
    global removed, allowed
    if isinstance(node, dict):
        if isinstance(node.get("deny"), list):
            before = len(node["deny"])
            node["deny"] = [x for x in node["deny"] if x != DENY_TARGET]
            removed += before - len(node["deny"])
        if isinstance(node.get("allow"), list):
            if ALLOW_RULE not in node["allow"]:
                node["allow"].append(ALLOW_RULE)
            allowed = True
        for v in node.values():
            walk(v)
    elif isinstance(node, list):
        for v in node:
            walk(v)

walk(data)
json.dump(data, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"removed_deny={removed} allow_added={allowed}")
PY

# Проверка валидности JSON; при ошибке — откат
if python3 -c "import json,sys; json.load(open('$F', encoding='utf-8'))" 2>/dev/null; then
  echo "✓ JSON валиден"
  echo "✓ Готово. Убрано deny на push в dev, добавлен allow."
  echo "⚠ Перезапусти Claude Code, чтобы правило применилось."
else
  cp "$BAK" "$F"
  echo "✖ JSON сломался — откатил из бэкапа. Ничего не изменено."
  exit 1
fi
