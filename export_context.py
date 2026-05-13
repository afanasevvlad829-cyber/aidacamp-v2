#!/usr/bin/env python3
"""
export_context.py — генерирует chatgpt_context.md из TOOLS.md + памяти проекта.
Запуск: python3 export_context.py
Или по крону: 0 9 * * * cd ~/Aidacamp-cloude && python3 export_context.py
"""

import os
import sys
import json
import datetime
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOOLS_MD = os.path.join(BASE_DIR, "TOOLS.md")
OUTPUT_MD = os.path.join(BASE_DIR, "chatgpt_context.md")

# ── статичная часть (проектная память) ───────────────────────────────────────

STATIC_CONTEXT = """# 🧠 Рабочий контекст: АйДаКемп / Кодимс
> Файл для работы вне Claude. Вставь как первое сообщение в ChatGPT.
> Сгенерировано: {generated_at}

---

## 👤 Кто я

**Влад Афанасьев** — основатель:
- **AidaCamp (АйДаКемп)** — детский IT-лагерь, 66 км от Москвы (санаторий Изумруд)
- **Codims / АйДаКодить** — офлайн-школа программирования для детей
- Директолог (Яндекс.Директ), 3CX партнёр, автор книги «Факап №18»

**Юрлица:**
- ООО «Воип Коннект» (ИНН 7729713637) — туроператор, РТО 025773
- ИП Афанасьева Дарья Викторовна — образовательная лицензия

**Стиль:** неформально, без воды, сардонично. Голосовой ввод → бывают фонетические опечатки.

---

## 🏗 Инфраструктура

| Что | Где |
|---|---|
| Продакшн сервер | 159.194.223.55 |
| Dev сервер | 159.194.210.65 |
| Локальный проект | ~/Aidacamp-cloude |
| GitHub | github.com/afanasevvlad829-cyber/aidacamp-v2 (branch: main) |
| Obsidian vault | /Users/vladimirafanasev/Aidacamp-cloude/ |
| MCP сервер | mcp.aidacamp.ru |

**nvm активация:**
```bash
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22
```

**Deploy тест:**
```bash
npm run build && rsync -avz --delete -e 'ssh -i ~/.ssh/aidacamp_prod' dist/client/ root@159.194.223.55:/var/www/aidacamp-dev/current/client/
```

---

## 🌐 Сайт aidacamp.ru

- Стек: Astro + Tailwind
- Метрика: 96499295, лид-цель ID: 541048197
- Чатбот: /ask (Claude Haiku через OpenRouter)
- Hero subtitle: «Пока другие на даче, ваш вернётся с AI-проектом — а у вас 14 дней для себя»

**Контакты:** +7(968)808-64-55, hello@codims.ru, wa.me/79688086455, t.me/Progaschool
**Координаты:** 55.265643, 36.724185

---

## 📋 Незакрытые задачи (актуально на {generated_at})

### P0 — AI-бот /ask
- [ ] FACTS задублированы в validator.ts и campData.ts
- [ ] Хардкод смены в booking popup
- [ ] 4 рендерера с innerHTML вместо mkEl()
- [ ] pg.Pool создаётся на каждый запрос (нет singleton)
- [ ] Нет rate limiting
- [ ] ANTHROPIC_API_KEY не добавлен в server .env
- [ ] OrbitAvatar не подключён к анимации

### P0 — Darya bot
- [ ] channel selection хардкодит "wa" вместо чтения pending_rules из PostgreSQL

### P1 — Сайт
- [ ] PageSpeed mobile: 69 → цель 85+
- [ ] team PNG → avif
- [ ] gallery JPGs → avif
- [ ] Kinescope lazy-load facade (запланирован)
- [ ] ALL_FIXES.md: 18 незакрытых фиксов
- [ ] AgeBar modal восстановить (28–32% конверсия vs 5–7%)

---

## 📊 Яндекс.Директ

Кампании: РСЯ 708698819 | Поиск 708664426 | Ретаргет 708615379
Регионы: только [1, 213]. СПб (ID 2) — НЕ добавлять.
Автотаргетинг: отключать сразу. Direct login: kv145.

Цели Метрики: form_submit 3000₽ | phone 1500₽ | whatsapp 1200₽ | telegram 1000₽ | shift 500₽

**Правило:** без данных из Метрики/Директа/Wordstat — маркировать «гипотеза».

---

## 🔐 Переменные окружения (для скриптов)

| Env var | Что |
|---|---|
| DIRECT_TOKEN | Яндекс.Директ |
| METRIKA_TOKEN | Яндекс.Метрика |
| YADISK_TOKEN | Яндекс.Диск |
| VK_TOKEN + VK_ACCOUNT_ID | VK Реклама |
| OPENROUTER_KEY | OpenRouter LLM |
| ANTHROPIC_API_KEY | Anthropic напрямую |
| OPENAI_API_KEY | OpenAI |
| TELEGRAM_BOT_TOKEN | Telegram Bot |
| ALFACRM_API_KEY + ALFACRM_HOST | АльфаCRM |
| DATAFORSEO_LOGIN + DATAFORSEO_KEY | DataForSEO |

Telegram основной чат: DAILY_DIGEST_CHAT_ID=244314247

---

## 🗄 PostgreSQL (localhost на сервере)

БД: aidacamp | Таблицы: crm_contacts, crm_contact_contexts, ai_dialogs, ai_tg_users, ai_guard_flags, pending_rules

---
"""

# ── функции ───────────────────────────────────────────────────────────────────

def read_tools_md():
    """Читает TOOLS.md и возвращает текст."""
    if not os.path.exists(TOOLS_MD):
        print(f"⚠️  TOOLS.md не найден: {TOOLS_MD}")
        return ""
    with open(TOOLS_MD, "r", encoding="utf-8") as f:
        return f.read()


def read_all_fixes():
    """Читает ALL_FIXES.md если есть."""
    path = os.path.join(BASE_DIR, "ALL_FIXES.md")
    if not os.path.exists(path):
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def get_git_status():
    """Возвращает краткий git log последних 5 коммитов."""
    try:
        result = subprocess.run(
            ["git", "-C", BASE_DIR, "log", "--oneline", "-5"],
            capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip()
    except Exception:
        return "(git недоступен)"


def build_context():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    parts = []

    # 1. Статичная часть с датой
    parts.append(STATIC_CONTEXT.format(generated_at=now))

    # 2. ALL_FIXES если есть
    fixes = read_all_fixes()
    if fixes:
        parts.append("\n---\n\n## 🔧 ALL_FIXES.md (полный список)\n\n" + fixes)

    # 3. Git log
    git_log = get_git_status()
    if git_log:
        parts.append(f"\n---\n\n## 📝 Последние коммиты\n\n```\n{git_log}\n```\n")

    # 4. TOOLS.md (API шпаргалка)
    tools = read_tools_md()
    if tools:
        parts.append("\n---\n\n## 📖 TOOLS.md — полный справочник API\n\n" + tools)

    return "\n".join(parts)


def main():
    print("🔄 Генерирую chatgpt_context.md...")

    context = build_context()

    with open(OUTPUT_MD, "w", encoding="utf-8") as f:
        f.write(context)

    size_kb = os.path.getsize(OUTPUT_MD) // 1024
    lines = context.count("\n")
    print(f"✅ Готово: {OUTPUT_MD}")
    print(f"   Размер: {size_kb} KB, строк: {lines}")
    print(f"\n💡 Для ChatGPT: вставь содержимое файла как первое сообщение.")
    print(f"   Или используй: cat {OUTPUT_MD} | pbcopy")


if __name__ == "__main__":
    main()
