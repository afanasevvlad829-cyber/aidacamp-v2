#!/usr/bin/env python3
"""
PreToolUse-страж: конвейер с внешним API не стартует без preflight-проверки.

Два инцидента из аудита сессии «CRM functionality research» (17.07.2026):
  - 16.07: ветка «внешнее ревью через Replicate» — 15 правок скрипта, ~4 часа,
    финал: «You have insufficient credit to run this model». На Replicate не было
    денег — ветка была мертворождённой с самого начала. Проверка биллинга заняла бы
    минуту ДО постройки конвейера.
  - 15.07: 9 headless-агентов на сервере «завершились», файлы разделов — 0 байт:
    «401 OAuth access token has expired». Smoke-агент №0 поймал бы это до очереди.

ЧТО ЛОВИТ (exit 2, если нет свежего маркера от scripts/preflight.sh):
  1. Запуск ОЧЕРЕДИ headless-агентов: `claude -p` ≥2 раз в команде, либо один
     раз, но в фоне (nohup/&/tmux) или внутри for/while-цикла.
     Требует маркер claude (= `claude -p "ping"` недавно прошёл).
  2. СОЗДАНИЕ predictions на Replicate: `api.replicate.com` + признак POST
     (-X POST / -d / --data / --json / --form).
     Требует маркер replicate (= токен и кредит проверены на hello-world).

ЧТО СОЗНАТЕЛЬНО НЕ ЛОВИТ — греп тут гадал бы:
  - одиночный foreground `claude -p` — это и ЕСТЬ smoke-проверка, её нельзя блокировать;
  - GET-поллинг Replicate (замер статуса не требует кредита) — replicate-poll.sh
    должен проходить свободно;
  - конвейеры к другим API (OpenAI, Gemini, ...) — у них нет общего греп-паттерна
    «это старт конвейера». Для них правило остаётся прозой в CLAUDE.md: один дешёвый
    вызов, проверяющий токен и биллинг, перед постройкой конвейера.

Маркеры: /tmp/aidacamp-preflight-<service>.ok, свежесть 30 минут.
Ставит их только scripts/preflight.sh (команды с preflight.sh — в белом списке).

Контракт хука: JSON на stdin, exit 2 + stderr = заблокировать, exit 0 = пропустить.
Самотест: python3 guard-preflight.py --selftest
"""

import json
import os
import re
import sys
import time

MARKER_DIR = os.environ.get("AIDACAMP_PREFLIGHT_DIR", "/tmp")
MARKER_TTL_SEC = 30 * 60

CLAUDE_HEADLESS = re.compile(r"\bclaude\s+(?:\S+\s+)*?(-p|--print)\b")
REPLICATE_HOST = "api.replicate.com"
POST_HINT = re.compile(r"(-X\s*POST|--data\b|--data-binary\b|--json\b|--form\b|\s-d\s)")
BACKGROUND = re.compile(r"\bnohup\b|\btmux\b|(?<!&)&\s*(disown\b)?\s*$|(?<!&)&\s*disown\b")
LOOP = re.compile(r"\bfor\s+\w+\s+in\b|\bwhile\b")


def marker_fresh(service: str) -> bool:
    path = os.path.join(MARKER_DIR, f"aidacamp-preflight-{service}.ok")
    try:
        return (time.time() - os.stat(path).st_mtime) < MARKER_TTL_SEC
    except OSError:
        return False


def required_service(cmd: str):
    """Какой preflight нужен этой команде: 'claude' | 'replicate' | None."""
    if "preflight.sh" in cmd:
        return None  # сам preflight ставит маркеры — не блокировать его

    if REPLICATE_HOST in cmd and POST_HINT.search(cmd):
        return "replicate"

    hits = CLAUDE_HEADLESS.findall(cmd)
    if len(hits) >= 2:
        return "claude"
    if len(hits) == 1 and (BACKGROUND.search(cmd) or LOOP.search(cmd)):
        return "claude"

    return None


def reason(service: str, cmd: str) -> str:
    how = {
        "claude": (
            "bash scripts/preflight.sh claude          # локальная очередь\n"
            "  bash scripts/preflight.sh claude <host>   # очередь на сервере (тот же ssh-канал)"
        ),
        "replicate": "REPLICATE_API_TOKEN=... bash scripts/preflight.sh replicate",
    }[service]
    incident = {
        "claude": "15.07.2026: 9 headless-агентов отработали вхолостую на протухшем OAuth (все файлы — 0 байт)",
        "replicate": "16.07.2026: ~4 часа на конвейер ревью, умерший на «insufficient credit» — денег не было с самого начала",
    }[service]
    return (
        f"Заблокировано: запуск конвейера без preflight-проверки ({service}).\n"
        f"Инцидент: {incident}.\n"
        f"Сначала одна дешёвая проверка токена/биллинга:\n"
        f"  {how}\n"
        f"Успех ставит маркер на 30 минут — после этого команда пройдёт."
    )


def extract_command(data: dict) -> str:
    """Bash → command; mcp ssh → command; mcp run(service=ssh) → params.command."""
    ti = data.get("tool_input") or {}
    if isinstance(ti.get("command"), str):
        return ti["command"]
    params = ti.get("params")
    if isinstance(params, dict) and isinstance(params.get("command"), str):
        return params["command"]
    return ""


def selftest() -> int:
    import tempfile

    global MARKER_DIR
    MARKER_DIR = tempfile.mkdtemp(prefix="preflight-selftest-")

    cases = [
        # (ожидаемый service|None, команда, почему кейс здесь)
        (None, 'claude -p "ping" --max-turns 1', "одиночный foreground — это сам smoke"),
        (None, "bash scripts/preflight.sh claude", "preflight в белом списке"),
        (None, "claude --help", "не headless-запуск"),
        (None, "tail -f /tmp/queue.log", "просто фон-проверка"),
        ("claude", 'nohup claude -p "review section 1" > /tmp/r1.log 2>&1 &', "один, но в фоне"),
        ("claude", 'for f in prompts/*.txt; do claude -p "$(cat $f)" > "out/$f.md"; done', "цикл-очередь — инцидент 15.07"),
        ("claude", 'claude -p "task1" > 1.md; claude -p "task2" > 2.md', "две штуки подряд"),
        ("claude", 'tmux new-session -d "claude -p task"', "tmux = фон"),
        ("replicate", "curl -sS -X POST https://api.replicate.com/v1/predictions -d '{}'", "создание prediction — инцидент 16.07"),
        ("replicate", 'curl https://api.replicate.com/v1/models/x/y/predictions --json "{}"', "создание через models-эндпоинт"),
        (None, "curl -s https://api.replicate.com/v1/predictions/abc123", "GET-поллинг статуса свободен"),
        (None, "bash /opt/scripts/replicate-poll.sh abc123", "поллер свободен"),
    ]
    bad = 0
    for expect, cmd, why in cases:
        got = required_service(cmd)
        mark = "✅" if got == expect else "❌"
        if got != expect:
            bad += 1
        print(f"  {mark} {str(expect or 'pass'):9} | {cmd[:70]}   ({why})")

    # Свежий маркер пропускает
    open(os.path.join(MARKER_DIR, "aidacamp-preflight-claude.ok"), "w").close()
    if marker_fresh("claude") and not marker_fresh("replicate"):
        print("  ✅ маркер: свежий пропускает, отсутствующий — нет")
    else:
        bad += 1
        print("  ❌ маркер: логика свежести сломана")

    print(f"\n{'✅ самотест пройден' if not bad else f'❌ провалов: {bad}'}")
    return 1 if bad else 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()

    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # не распарсили вход — fail-open, чтобы не заблокировать работу

    cmd = extract_command(data)
    if not cmd:
        return 0

    service = required_service(cmd)
    if service is None or marker_fresh(service):
        return 0

    print(reason(service, cmd), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
