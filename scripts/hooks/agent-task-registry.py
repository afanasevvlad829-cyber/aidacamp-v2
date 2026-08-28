#!/usr/bin/env python3
"""
Реестр выданных фоновых задач: задача → время → путь к результату. Сверка на рестарте.

Аудит сессии «CRM functionality research» (17.07.2026): явный запрос владельца
(аудит по §1.6) запускался дважды, оба запуска умерли (killed 20:00, failed 20:19),
в 03:14 оркестратор написал «Перезапущу» — и перезапуска не было до конца сессии.
Задача умерла молча, потому что список выданного жил только в контексте разговора.

Два режима:
  1. Без аргументов (PostToolUse-хук на Agent/Task): читает JSON со stdin и дописывает
     строку в реестр .claude/agent-tasks.jsonl — {ts, desc, output}. Регистрируются
     только фоновые запуски с файловым контрактом (guard-agent-output.py гарантирует,
     что путь в prompt есть).
  2. --reconcile (зовётся из session-start.sh при старте/рестарте сессии): статус задачи
     НЕ спрашивается у кого-либо, а выводится из артефакта — файл результата существует
     и непуст → задача закрыта; файла нет/пуст → задача показывается как незакрытая.
     Обещание «сделаю» может соврать, наличие файла — нет.

Окно сверки — 72 часа; строки старше 7 суток вычищаются при регистрации.
Реестр — на worktree (у каждой сессии свой .claude/), в git не попадает (.claude/* в .gitignore).

Самотест: python3 agent-task-registry.py --selftest
"""

import datetime
import json
import os
import re
import subprocess
import sys

RECONCILE_WINDOW_H = 72

# Скретчпад сессии: /tmp/claude-501/<slug>/<uuid>/scratchpad/… (и /private/tmp/…).
# Тот же паттерн, что в guard-agent-output.py — файлы хуков самодостаточны,
# поэтому регулярка продублирована сознательно, а не вынесена в общий модуль.
EPHEMERAL = re.compile(r"(?:^|/)(?:private/)?tmp/claude-\d+/.*?/scratchpad/", re.I)
TRIM_AFTER_DAYS = 7

# Тот же паттерн, что в guard-agent-output.py (файлы хуков самодостаточны — имя с
# дефисами не импортируется; менять — синхронно в обоих)
URL = re.compile(r"https?://\S+")
OUTPUT_PATH = re.compile(
    r"[\w~.\-]*/[\w~.\-/]*\.(?:md|json|jsonl|txt|csv|tsv|html|log|xml|ya?ml)\b"
)


def registry_path() -> str:
    if os.environ.get("AIDACAMP_REGISTRY"):  # для самотеста
        return os.environ["AIDACAMP_REGISTRY"]
    root = os.environ.get("CLAUDE_PROJECT_DIR")
    if not root:
        try:
            root = subprocess.run(
                ["git", "rev-parse", "--show-toplevel"],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip() or os.getcwd()
        except Exception:
            root = os.getcwd()
    return os.path.join(root, ".claude", "agent-tasks.jsonl")


def load(path: str) -> list:
    entries = []
    try:
        with open(path, encoding="utf-8") as fp:
            for line in fp:
                line = line.strip()
                if not line:
                    continue
                try:
                    entries.append(json.loads(line))
                except json.JSONDecodeError:
                    continue  # битая строка не должна валить сверку
    except OSError:
        pass
    return entries


def now() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


def parse_ts(entry: dict):
    try:
        return datetime.datetime.fromisoformat(entry["ts"])
    except Exception:
        return None


def register(data: dict) -> None:
    ti = data.get("tool_input") or {}
    if not isinstance(ti, dict):
        return
    if ti.get("run_in_background") is False:
        return  # синхронный агент вернул результат в сессию — реестр не нужен
    prompt = ti.get("prompt") or ""
    m = OUTPUT_PATH.search(URL.sub(" ", prompt))
    entry = {
        "ts": now().isoformat(timespec="seconds"),
        "desc": (ti.get("description") or prompt.replace("\n", " ")[:80]).strip(),
        "output": m.group(0) if m else None,
    }
    path = registry_path()
    os.makedirs(os.path.dirname(path), exist_ok=True)

    # Вычистить строки старше TRIM_AFTER_DAYS, дописать новую
    cutoff = now() - datetime.timedelta(days=TRIM_AFTER_DAYS)
    kept = [e for e in load(path) if (parse_ts(e) or now()) >= cutoff]
    kept.append(entry)
    with open(path, "w", encoding="utf-8") as fp:
        for e in kept:
            fp.write(json.dumps(e, ensure_ascii=False) + "\n")


def result_exists(output: str) -> bool:
    p = os.path.expanduser(output)
    try:
        return os.path.getsize(p) > 0
    except OSError:
        return False


def reconcile() -> str:
    cutoff = now() - datetime.timedelta(hours=RECONCILE_WINDOW_H)
    open_tasks = []
    for e in load(registry_path()):
        ts = parse_ts(e)
        if ts is None or ts < cutoff:
            continue
        out = e.get("output")
        if out and result_exists(out):
            continue  # артефакт на месте — задача закрыта
        # Путь ведёт в скретчпад сессии — проверить нечем, и это НЕ вина агента:
        # скретчпад чистится на ходу, файл мог быть написан и стёрт. Разбор
        # 01.08.2026: 45 из 46 записей в окне были именно такими, и реестр
        # показывал их как незакрытые вечно — на такой список перестают смотреть.
        # Отсутствие каталога целиком — тот же случай, лишь более поздняя стадия.
        # Новые задачи в скретчпад уже не пропускает guard-agent-output.py,
        # поэтому фильтр касается только исторических записей.
        if out and (
            EPHEMERAL.search(out)
            or not os.path.isdir(os.path.dirname(os.path.expanduser(out)))
        ):
            continue
        where = f"→ {out} (файла нет/пуст)" if out else "(без файлового контракта)"
        open_tasks.append(f"  • {e.get('ts', '?')[:16]} «{e.get('desc', '?')}» {where}")

    if not open_tasks:
        return ""
    return (
        "⚠️ РЕЕСТР ФОНОВЫХ ЗАДАЧ — выданы, но файла результата нет:\n"
        + "\n".join(open_tasks[:15])
        + "\nСверь с реальностью (TaskList / tail лога) и либо перезапусти, либо "
        "убедись, что результат уже не нужен. Инцидент 17.07.2026: «Перезапущу» "
        "было написано — перезапуска не было."
    )


def selftest() -> int:
    import tempfile

    bad = 0
    with tempfile.TemporaryDirectory(prefix="registry-selftest-") as tmp:
        os.environ["AIDACAMP_REGISTRY"] = os.path.join(tmp, "agent-tasks.jsonl")
        done_file = os.path.join(tmp, "done-review.md")

        register({"tool_input": {
            "description": "Review v5.1 fixes",
            "prompt": f"Отревьюируй ТЗ, результат в {tmp}/dead-review.md",
        }})
        register({"tool_input": {
            "description": "Аудит §1.6",
            "prompt": f"Проверь §1.6, результат в {done_file}",
        }})
        register({"tool_input": {
            "description": "Быстрый lookup",
            "prompt": "Где определён getCurrentPrice?",
            "run_in_background": False,
        }})
        with open(done_file, "w") as fp:
            fp.write("готово")

        report = reconcile()
        checks = [
            ("dead-review.md" in report, "погибшая задача видна в сверке"),
            ("Аудит §1.6" not in report, "задача с готовым файлом закрыта молча"),
            ("Быстрый lookup" not in report, "синхронный агент не регистрируется"),
            (len(load(os.environ["AIDACAMP_REGISTRY"])) == 2, "в реестре ровно 2 фоновые записи"),
        ]
        for ok, why in checks:
            print(f"  {'✅' if ok else '❌'} {why}")
            bad += 0 if ok else 1

        # Пустой отчёт, когда всё закрыто
        with open(os.path.expanduser(os.path.join(tmp, "dead-review.md")), "w") as fp:
            fp.write("дописали")
        ok = reconcile() == ""
        print(f"  {'✅' if ok else '❌'} все файлы на месте → сверка молчит")
        bad += 0 if ok else 1

    print(f"\n{'✅ самотест пройден' if not bad else f'❌ провалов: {bad}'}")
    return 1 if bad else 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()

    if "--reconcile" in sys.argv:
        report = reconcile()
        if report:
            print(report)
        return 0

    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0
    try:
        register(data)
    except Exception:
        pass  # реестр — вспомогательный: его сбой не должен мешать работе
    return 0


if __name__ == "__main__":
    sys.exit(main())
