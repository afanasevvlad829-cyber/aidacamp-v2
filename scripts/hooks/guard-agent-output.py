#!/usr/bin/env python3
"""
PreToolUse-страж (Agent/Task): фоновый субагент обязан писать результат в файл.

Аудит сессии «CRM functionality research» (17.07.2026): 5 из 9 фоновых ревьюеров
умерли при рестартах сессии БЕЗ СЛЕДА — они делали 0 Write (только Read + финальный
текст). Секции волны A, которые сохранялись файлами, пережили всё. Для Bash это
правило давно есть (nohup + лог-файл + tail); это его зеркало для Agent-инструмента:
результат — в файл, финальное сообщение — только резюме.

ЧТО ЛОВИТ (exit 2): запуск субагента в фоне, в prompt которого не назван путь
к файлу результата (токен со слешем и текстовым расширением: /tmp/review.md,
~/out/report.json, docs/audit.md, ...).

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


def has_output_contract(prompt: str) -> bool:
    return bool(OUTPUT_PATH.search(URL.sub(" ", prompt)))


def verdict(tool_input: dict) -> bool:
    """True = заблокировать."""
    if tool_input.get("run_in_background") is False:
        return False
    if tool_input.get("subagent_type") in READONLY_TYPES:
        return False
    prompt = tool_input.get("prompt") or ""
    return not has_output_contract(prompt)


REASON = (
    "Заблокировано: фоновый субагент без файлового контракта вывода.\n"
    "Инцидент 16.07.2026: 5 из 9 фоновых ревьюеров умерли при рестартах сессии без "
    "следа — они не писали файлов, весь результат жил в финальном сообщении.\n"
    "Как исправить (одно из двух):\n"
    "  1. Добавь в prompt путь: «Полный результат запиши в <путь>.md, в ответ верни "
    "резюме в 3-5 строк» — тогда результат переживает рестарт, а реестр сможет свериться;\n"
    "  2. Либо запусти синхронно (run_in_background: false), если результат нужен "
    "прямо сейчас и он короткий."
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
    ]
    bad = 0
    for expect, ti, why in cases:
        got = verdict(ti)
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

    if not verdict(ti):
        return 0

    print(REASON, file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
