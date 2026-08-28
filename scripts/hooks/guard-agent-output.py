#!/usr/bin/env python3
"""
PreToolUse-страж (Agent/Task): фоновый субагент обязан писать результат в файл.

Аудит сессии «CRM functionality research» (17.07.2026): 5 из 9 фоновых ревьюеров
умерли при рестартах сессии БЕЗ СЛЕДА — они делали 0 Write (только Read + финальный
текст). Секции волны A, которые сохранялись файлами, пережили всё. Для Bash это
правило давно есть (nohup + лог-файл + tail); это его зеркало для Agent-инструмента:
результат — в файл, финальное сообщение — только резюме.

ЧТО ЛОВИТ (exit 2), два случая:
  1. Запуск субагента в фоне, в prompt которого не назван путь к файлу результата
     (токен со слешем и текстовым расширением: /tmp/review.md, ~/out/report.json,
     docs/audit.md, ...).
  2. Путь назван, но ведёт в СКРЕТЧПАД СЕССИИ (/tmp/claude-*/…/<uuid>/scratchpad/).
     Разбор реестра 01.08.2026: из 76 записей без результата 16 указывали в каталог
     сессии, удалённый целиком, — проверить их стало нечем в принципе. Скретчпад
     живёт не дольше сессии и чистится на ходу, поэтому как адрес РЕЗУЛЬТАТА он
     не годится: файл должен пережить и рестарт, и конец сессии, иначе реестр
     копит ложные «незакрытые задачи» и перестаёт что-либо значить.
     Для промежуточных черновиков агента скретчпад по-прежнему уместен — правило
     только про итоговый файл, который назван в контракте.

ЧТО СОЗНАТЕЛЬНО НЕ ЛОВИТ:
  - run_in_background: false — синхронный агент возвращает результат прямо в ход
    сессии, файловый контракт избыточен;
  - read-only типы агентов (Explore, Plan) — у них нет Write, контракт физически
    невозможен, а перезапуск дёшев;
  - «а агент ДЕЙСТВИТЕЛЬНО записал?» — это проверяет реестр на рестарте
    (agent-task-registry.py --reconcile), не этот страж. Здесь только контракт
    в брифе — то, что греп видит точно.

Контракт хука: JSON на stdin, exit 2 + stderr = заблокировать, exit 0 = пропустить.
Самотест: python3 guard-agent-output.py --selftest
"""

import json
import re
import sys

# У этих типов нет инструмента Write — файловый контракт с них не спросишь
READONLY_TYPES = {"Explore", "Plan"}

URL = re.compile(r"https?://\S+")
# Токен со слешем, оканчивающийся текстовым расширением — «путь к файлу результата»
OUTPUT_PATH = re.compile(
    r"[\w~.\-]*/[\w~.\-/]*\.(?:md|json|jsonl|txt|csv|tsv|html|log|xml|ya?ml)\b"
)
# Скретчпад сессии: /tmp/claude-501/<slug>/<uuid>/scratchpad/... (и /private/tmp/…).
# Живёт не дольше сессии — как адрес результата не годится.
EPHEMERAL = re.compile(r"(?:^|/)(?:private/)?tmp/claude-\d+/.*?/scratchpad/", re.I)

# Куда писать вместо скретчпада: переживает рестарт сессии и снос воркдира
PERSISTENT_HINT = "~/.claude/agent-results/<задача>.md"


def output_paths(prompt: str) -> list:
    return OUTPUT_PATH.findall(URL.sub(" ", prompt))


def has_output_contract(prompt: str) -> bool:
    return bool(output_paths(prompt))


def only_ephemeral(prompt: str) -> bool:
    """True = контракт есть, но ВСЕ названные пути — в скретчпаде сессии."""
    paths = output_paths(prompt)
    return bool(paths) and all(EPHEMERAL.search(p) for p in paths)


def verdict(tool_input: dict) -> str:
    """'' = пропустить, иначе причина блокировки."""
    if tool_input.get("run_in_background") is False:
        return ""
    if tool_input.get("subagent_type") in READONLY_TYPES:
        return ""
    prompt = tool_input.get("prompt") or ""
    if not has_output_contract(prompt):
        return REASON_NO_CONTRACT
    if only_ephemeral(prompt):
        return REASON_EPHEMERAL
    return ""


REASON_NO_CONTRACT = (
    "Заблокировано: фоновый субагент без файлового контракта вывода.\n"
    "Инцидент 16.07.2026: 5 из 9 фоновых ревьюеров умерли при рестартах сессии без "
    "следа — они не писали файлов, весь результат жил в финальном сообщении.\n"
    "Как исправить (одно из двух):\n"
    f"  1. Добавь в prompt путь: «Полный результат запиши в {PERSISTENT_HINT}, в ответ "
    "верни резюме в 3-5 строк» — тогда результат переживает рестарт, а реестр сможет "
    "свериться;\n"
    "  2. Либо запусти синхронно (run_in_background: false), если результат нужен "
    "прямо сейчас и он короткий."
)

REASON_EPHEMERAL = (
    "Заблокировано: файл результата назван в СКРЕТЧПАДЕ СЕССИИ — он туда не переживёт.\n"
    "Скретчпад (/tmp/claude-*/…/scratchpad/) чистится на ходу и исчезает вместе с "
    "сессией. Разбор реестра 01.08.2026: 16 задач из 76 указывали в каталог, удалённый "
    "целиком, — проверить их стало нечем, а реестр показывал их как незакрытые вечно.\n"
    f"Как исправить: путь результата — в постоянный каталог, например {PERSISTENT_HINT}\n"
    "Скретчпад оставь для промежуточных черновиков агента: правило только про итоговый "
    "файл, который назван в контракте."
)


def selftest() -> int:
    cases = [
        # (ожидание_blocked, tool_input, почему кейс здесь)
        (True, {"prompt": "Отревьюируй TZ.md v5.1 и перечисли блокеры"},
         "инцидент: ревьюер без файла, фон по умолчанию"),
        (True, {"prompt": "Review v5.1 fixes", "run_in_background": True},
         "явный фон без файла"),
        (False, {"prompt": "Отревьюируй ТЗ. Полный результат запиши в /tmp/review-v51.md, в ответ — резюме"},
         "правильный паттерн"),
        (False, {"prompt": "Результат — в docs/superpowers/audit.md, вернёшь резюме"},
         "относительный путь тоже контракт"),
        (False, {"prompt": "Быстро глянь, где определён getCurrentPrice", "run_in_background": False},
         "синхронный — контракт не нужен"),
        (False, {"prompt": "Найди все вхождения canonical", "subagent_type": "Explore"},
         "read-only тип: Write нет физически"),
        (True, {"prompt": "Прочитай https://example.com/doc.md и оцени качество"},
         "URL — не файловый контракт"),
        (False, {"prompt": "Сравни ~/aidacrm/TZ.md с прототипом, вывод в ~/aidacrm/diff-report.md"},
         "путь с ~"),
        # --- скретчпад сессии как адрес результата (разбор реестра 01.08.2026)
        (True, {"prompt": "Отчёт запиши в /private/tmp/claude-501/-Users-vlad-repo/"
                          "a84d89a6-596d-4adb-a003-fb5c697acd23/scratchpad/report.md"},
         "скретчпад сессии — не переживёт её"),
        (True, {"prompt": "Результат — /tmp/claude-501/-Users-x/uuid/scratchpad/out.json"},
         "тот же путь без /private"),
        (False, {"prompt": "Полный результат — в ~/.claude/agent-results/audit.md"},
         "постоянный каталог"),
        (False, {"prompt": "Черновики клади в /tmp/claude-501/-U/uuid/scratchpad/tmp.md, "
                           "итог — в ~/.claude/agent-results/final.md"},
         "скретчпад для черновиков + постоянный для итога"),
    ]
    bad = 0
    for expect, ti, why in cases:
        got = bool(verdict(ti))
        mark = "✅" if got == expect else "❌"
        if got != expect:
            bad += 1
        label = "deny" if expect else "pass"
        print(f"  {mark} {label:4} | {str(ti.get('prompt'))[:64]}   ({why})")
    print(f"\n{'✅ самотест пройден' if not bad else f'❌ провалов: {bad}'}")
    return 1 if bad else 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()

    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # fail-open: не блокировать работу из-за нечитаемого входа

    ti = data.get("tool_input") or {}
    if not isinstance(ti, dict) or not ti.get("prompt"):
        return 0

    reason = verdict(ti)
    if not reason:
        return 0

    print(reason, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
