#!/usr/bin/env python3
"""
PreToolUse-страж: деструктивные операции (политика — AGENTS.md).

Канон — эта копия в репо (scripts/hooks/), подключена в .claude/settings.json, поэтому
работает и на VPS, и в headless-запусках. Глобальная копия ~/.claude/hooks/ на Mac
владельца дублирует её; при правке держать обе одинаковыми.

AGENTS.md требует: «An agent must STOP and ask in plain text. "The task seems to
require it" is NOT confirmation». Прозой это правило живёт с мая — и ровно так же
прозой оно жило 22.05.2026, когда ручной `rsync --delete` по живому веб-руту стёр
`current/`, `.env` и `node_modules`. Здесь оно становится механикой.

Хук БЛОКИРУЕТ и объясняет; разрешение по-прежнему даёт только владелец в чате —
после чего команду выполняет он сам либо снимает хук осознанно.

ЧТО УЖЕ ЗАКРЫТО БЕЗ НАС (не дублируем — двойная защита путает):
  permissions.deny глобально : git push --force, git push origin main, rm -rf /,
                               DROP TABLE/DATABASE, TRUNCATE, npm install --prefix /var/www
  permissions.deny в проекте : deploy.sh prod, git push --force/-f

ЧЕГО ЗДЕСЬ СОЗНАТЕЛЬНО НЕТ — греп соврал бы:
  • `git rebase` — AGENTS.md зовёт его деструктивным на общих ветках, но CLAUDE.md
    сам ПРЕДПИСЫВАЕТ `git pull --rebase origin dev` на старте каждой сессии. Отличить
    перезапись общей ветки от легального ребейза своей по тексту команды нельзя.
  • `git commit --amend` — запрещён «на уже запушенном». Запушен ли коммит, из текста
    команды не видно; проверка требует обращения к git и всё равно гонки.
  • `rm -rf` вне scoped-каталога — «clearly scoped build/temp dir» это суждение.
    Катастрофический `rm -rf /` уже в permissions.deny.
  Это остаётся прозой в AGENTS.md. Врущий гейт хуже отсутствующего.

Контракт хука: JSON на stdin, exit 2 + stderr = заблокировать, exit 0 = пропустить.
Самотест: python3 guard-destructive-ops.py --selftest
"""

import json
import re
import sys

# (regex, короткое имя, объяснение + чем заменить)
RULES = [
    (
        r'\bgit\s+reset\s+--hard\b',
        "git reset --hard",
        "Стирает коммиты и правки без следа. AGENTS.md: только с явного согласия владельца.\n"
        "Замена: `git revert <sha>` — та же отмена, но обратимая и с историей.",
    ),
    (
        r'\bgit\s+clean\s+-[a-z]*f',
        "git clean -f",
        "Удаляет неотслеживаемые файлы безвозвратно — включая чужую незакоммиченную работу.\n"
        "Замена: `git stash -u` (то же самое, но с возможностью вернуть), либо `git clean -n` — сухой прогон.",
    ),
    (
        r'\bgit\s+(?:checkout\s+--|restore)\s+\.(?:\s|$)',
        "git checkout -- . / git restore .",
        "Затирает ВСЕ незакоммиченные правки в дереве. Инцидент-класс: параллельная сессия\n"
        "теряет работу молча (см. память: promote dev→main уже так стирал дерево).\n"
        "Замена: `git stash`, либо укажи конкретный файл вместо точки.",
    ),
    (
        r'\bgit\s+stash\s+(?:drop|clear)\b',
        "git stash drop/clear",
        "Стирает отложенную работу — часто чужую. AGENTS.md: только с явного согласия.\n"
        "Замена: `git stash list` и разбор по одному; `git stash show -p` чтобы увидеть содержимое.",
    ),
    (
        r'\bgit\s+branch\s+-D\b',
        "git branch -D",
        "Force-удаление невмёрженной ветки — коммиты остаются только в reflog.\n"
        "Замена: `git branch -d` (откажется, если не влито) — и это правильный отказ.",
    ),
    (
        r'\bgit\s+reflog\s+expire\b|\bgit\s+gc\s+--prune=now\b',
        "git reflog expire / git gc --prune=now",
        "Обрубает последнюю сеть безопасности: после этого потерянные коммиты не вернуть.",
    ),
    (
        r'\bgit\s+push\b[^|;&]*(?:--delete\b|\s:\S)',
        "git push --delete / push :branch",
        "Удаляет ветку на remote. AGENTS.md: только с явного согласия владельца.",
    ),
    (
        r'--no-verify\b',
        "--no-verify",
        "Обходит git-хуки — то есть ровно те стражи, которые ловят инциденты до прода.\n"
        "AGENTS.md: NEVER. Если хук мешает — чинить хук, а не обходить.",
    ),
    (
        r'\b(?:MASTER_AGENT|PIPELINE_BYPASS)=1\b',
        "MASTER_AGENT=1 / PIPELINE_BYPASS=1",
        "AGENTS.md: агент НИКОГДА не выставляет их за владельца — это его личный обход.\n"
        "Если правка правда нужна в главном репо — пусть владелец выполнит команду сам.",
    ),
    (
        r'(?=[^|;&]*\brsync\b)(?=[^|;&]*--delete\b)[^|;&]*/var/www',
        "rsync --delete по /var/www",
        "ИНЦИДЕНТ 22.05.2026: ручной `rsync --delete` по живому веб-руту стёр current/, .env\n"
        "и node_modules. AGENTS.md: деплой ТОЛЬКО через ./scripts/deploy.sh [dev|prod],\n"
        "rsync руками — никогда. Скрипт знает про --exclude симлинков медиа, ты — нет.",
    ),
    (
        # Корень релиза CRM или его node_modules, cp с -a/-r, но без -l (хардлинков).
        r'\bcp(?![^|;&"\']*(?:\s-[a-zA-Z]*l|--link\b))'
        r'(?=[^|;&"\']*(?:\s-[a-zA-Z]*[aRr]|--archive\b|--recursive\b))'
        r'\s[^|;&"\']*aidacrm-releases/(?:\$\{?\w+\}?|[\w.-]+)(?:/server)?(?:/node_modules)?/?(?=[\s"\']|$)',
        "cp -a релиза CRM без хардлинков",
        "ИНЦИДЕНТ 24.09.2026: хотфикс-релизы 9717147 и af8dfc7 на aidacrm собраны как\n"
        "`cp -a <релиз> <новый>` — полная копия node_modules, +1.2 ГБ каждый, диск 24 ГБ дошёл до 100%.\n"
        "Правильно: код — `git --git-dir=/root/aidacrm.git worktree add --detach <rel> <sha>`,\n"
        "node_modules — `cp -al` из рабочего релиза (если lock-файлы не менялись), как в\n"
        "/root/daria-deploy.sh. Правки поверх копии через scp — только после коммита, не в хардлинки.",
    ),
]
# Правила, где владельца спрашивать не о чем: команду надо просто переписать.
REWRITE_ONLY = {"cp -a релиза CRM без хардлинков"}

COMPILED = [(re.compile(p), name, why) for p, name, why in RULES]


def extract_command(data: dict) -> str:
    """Форма ввода зависит от инструмента — см. guard-blocking-wait.py."""
    ti = data.get("tool_input") or {}
    if isinstance(ti.get("command"), str):
        return ti["command"]
    params = ti.get("params")
    if isinstance(params, dict) and isinstance(params.get("command"), str):
        return params["command"]
    return ""


def check(cmd: str):
    """Возвращает (name, why) первого сработавшего правила либо None."""
    for rx, name, why in COMPILED:
        if rx.search(cmd):
            return name, why
    return None


def selftest() -> int:
    cases = [
        # (должно_блокироваться, команда, почему кейс здесь)
        (True, "git reset --hard origin/dev", "история"),
        (True, "git clean -fdx", "дерево"),
        (True, "git clean -fd", "дерево"),
        (True, "git checkout -- .", "затирает всё дерево"),
        (True, "git restore .", "затирает всё дерево"),
        (True, "git stash drop", "чужая работа"),
        (True, "git branch -D feature/x", "невмёрженная ветка"),
        (True, "git gc --prune=now", "сеть безопасности"),
        (True, "git push origin --delete feature/x", "remote"),
        (True, "git commit --no-verify -m x", "обход хуков"),
        (True, "MASTER_AGENT=1 git commit -m x", "обход за владельца"),
        (True, "rsync -a --delete dist/ root@h:/var/www/aidacamp/current/", "ИНЦИДЕНТ 22.05"),
        (True, 'ssh aidacrm "test -d $R || cp -a /root/aidacrm-releases/9b09a97 $R" && scp x aidacrm:$R/',
         "ИНЦИДЕНТ 24.09 дословно"),
        (True, "cp -a /root/aidacrm-releases/9b09a97/ /root/aidacrm-releases/af8dfc7", "слеш в конце"),
        (True, "cp -r /root/aidacrm-releases/af8dfc7/server/node_modules $REL/server/", "node_modules через -r"),
        (True, "cp --archive /root/aidacrm-releases/af8dfc7 /root/x", "длинный флаг"),
        (True, 'ssh aidacrm "test -d $R || cp -a /root/aidacrm-releases/$CUR $R"', "ПОВТОР 25.09: имя в переменной"),
        (True, "cp -a /root/aidacrm-releases/${CUR}/ $R", "переменная в фигурных"),
        # Ниже — легальное. Каждый кейс тут потому, что наивный греп его бы уронил.
        (False, "git clean -n", "сухой прогон — не удаляет"),
        (False, "git branch -d merged-branch", "безопасное удаление, откажется если не влито"),
        (False, "git checkout -- src/pages/ask.astro", "конкретный файл, не точка"),
        (False, "git restore src/lib/foo.ts", "конкретный файл"),
        (False, "git stash list", "чтение"),
        (False, "git reset HEAD~1", "мягкий reset, коммиты целы"),
        (False, "git pull --rebase origin dev", "ПРЕДПИСАНО в CLAUDE.md на старте сессии"),
        (False, "git rebase origin/dev", "легальный ребейз своей ветки — греп не отличит"),
        (False, "git commit --amend -m x", "не видно, запушен ли — не гадаем"),
        (False, "rsync -a dist/ root@h:/var/www/aidacamp/current/", "без --delete"),
        (False, "rsync -a --delete dist/ /tmp/backup/", "--delete, но не по /var/www"),
        (False, "bash scripts/deploy.sh dev", "правильный путь деплоя"),
        (False, "cp -al /root/aidacrm-releases/9b09a97/node_modules $REL/node_modules", "хардлинки — как в daria-deploy.sh"),
        (False, "cp -a /root/aidacrm-releases/af8dfc7/dist/. /var/www/aidaplus-dist/", "dist, не весь релиз"),
        (False, "cp -a /root/aidacrm-releases/af8dfc7/server/.env /tmp/x", "один файл из релиза"),
        (False, "cp -a /root/aidacrm-releases/$CUR/dist/. /var/www/aidaplus-dist/", "dist из релиза-переменной"),
        (False, "ls -la /root/aidacrm-releases/ && cp -a a b", "cp не по релизу"),
        (False, "git push origin HEAD", "обычный push"),
        (False, "git status", "чтение"),
    ]
    bad = 0
    for expect, cmd, why in cases:
        hit = check(cmd)
        got = hit is not None
        ok = got == expect
        bad += 0 if ok else 1
        label = "БЛОК" if expect else "пропуск"
        mark = "✅" if ok else "❌"
        extra = f"  →  сработало «{hit[0]}»" if (hit and not expect) else ""
        print(f"  {mark} {label:7} | {cmd}   ({why}){extra}")
    print(f"\n{'✅ самотест пройден' if not bad else f'❌ провалов: {bad}'}")
    return 1 if bad else 0


def main() -> int:
    if "--selftest" in sys.argv:
        return selftest()

    try:
        data = json.load(sys.stdin)
    except Exception:
        return 0  # не распарсили — не мешаем работать

    cmd = extract_command(data)
    if not cmd:
        return 0

    hit = check(cmd)
    if not hit:
        return 0

    name, why = hit
    if name in REWRITE_ONLY:
        print(f"Заблокировано: {name}.\n\n{why}\n\nПерепиши команду по образцу выше.",
              file=sys.stderr)
        return 2
    print(
        f"Заблокировано: {name} — деструктивная операция (AGENTS.md).\n\n"
        f"{why}\n\n"
        f"AGENTS.md: «An agent must STOP and ask in plain text. \"The task seems to require\n"
        f"it\" is NOT confirmation». Объясни владельцу, зачем это нужно, и дождись ответа —\n"
        f"выполнять команду за него нельзя.",
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
