#!/usr/bin/env python3
"""
SEO Kaizen — ежедневное автоматическое микро-улучшение одной страницы.
Принцип: +2% каждый день. Маленькие изменения компаундируются.

Уровни улучшений (по нарастающей трудоёмкости):
  L1 — metadata: исправить title/H1/meta (0 риска, <5 мин)
  L2 — faq_add: добавить FAQ-блок 4-5 вопросов (~15 мин)
  L3 — content_expand: расширить раздел на 150-250 слов с LSI (~25 мин)
  L4 — schema_add: добавить JSON-LD разметку (~10 мин)
  L5 — internal_link: добавить 2-3 внутренние ссылки (~10 мин)

Логика выбора страницы:
  1. Приоритет: quick wins (поз 4-20, объём ≥ 200)
  2. Затем: страницы с падением (объём ≥ 300)
  3. Затем: тонкий контент (<800 слов) с позициями
  4. Ограничение: одна страница не чаще раза в 14 дней

Cron: 0 9 * * 1-5 (пн-пт, 9:00 — после брифинга)
"""

import os, json, subprocess, psycopg2, urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path
import re

# ── Config ──────────────────────────────────────────────────
DB        = "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp"
REPO_DIR  = "/Users/vladimirafanasev/Aidacamp-cloude"
TG_BOT    = "8619240142:AAEZluPyzdCTDNEiRFSLt7I8Ka4dC8ntfHc"
TG_CHAT   = "244314247"
CLAUDE    = os.path.expanduser("~/.local/bin/claude")
PLANS_DIR = "/opt/seo-etl/plans"
LOG       = f"{REPO_DIR}/logs/seo-kaizen.log"
RULES_FILE= "/opt/seo-etl/knowledge_rules.json"

os.makedirs(os.path.dirname(LOG), exist_ok=True)

def log(msg):
    line = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line)
    with open(LOG, "a") as f:
        f.write(line + "\n")

def tg(text):
    body = json.dumps({
        "chat_id": TG_CHAT,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True
    }).encode()
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TG_BOT}/sendMessage",
        data=body, headers={"Content-Type": "application/json"}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        log(f"TG error: {e}")

# ── Шаг 1: Выбрать страницу для сегодняшнего Кайдзен ────────
def pick_target(conn):
    cur = conn.cursor()

    # Страницы, которые уже улучшали последние 14 дней
    cur.execute("""
        SELECT url FROM seo_kaizen_log
        WHERE date >= CURRENT_DATE - 14 AND status != 'cancelled'
    """)
    recent_urls = {r[0] for r in cur.fetchall()}

    last_date = None
    cur.execute("SELECT MAX(date) FROM seo_positions")
    row = cur.fetchone()
    if row:
        last_date = row[0]

    if not last_date:
        return None

    # Приоритет 1: Quick wins (поз 4-20, объём ≥ 200)
    cur.execute("""
        SELECT DISTINCT ON (p.url)
            p.url, p.keyword, p.position, p.volume,
            pg.word_count, pg.title, pg.h1
        FROM seo_positions p
        LEFT JOIN seo_pages pg ON pg.url = p.url
        WHERE p.date = %s
          AND p.position BETWEEN 4 AND 20
          AND p.volume >= 200
        ORDER BY p.url, p.volume DESC
    """, (last_date,))
    candidates = [
        {"url": r[0], "keyword": r[1], "pos": r[2], "vol": r[3],
         "words": r[4] or 0, "title": r[5] or "", "h1": r[6] or "",
         "reason": "quick_win"}
        for r in cur.fetchall()
        if r[0] not in recent_urls
    ]

    # Приоритет 2: Падения (объём ≥ 300, упали ≥ 5)
    if not candidates:
        cur.execute("""
            SELECT DISTINCT ON (p.url)
                p.url, p.keyword, p.position, p.volume,
                pg.word_count, pg.title, pg.h1
            FROM seo_positions p
            JOIN seo_positions prev ON prev.keyword = p.keyword
                AND prev.date = (SELECT MAX(date) FROM seo_positions WHERE date < %s)
            LEFT JOIN seo_pages pg ON pg.url = p.url
            WHERE p.date = %s
              AND p.volume >= 300
              AND (p.position - prev.position) >= 5
            ORDER BY p.url, (p.position - prev.position) DESC
        """, (last_date, last_date))
        candidates = [
            {"url": r[0], "keyword": r[1], "pos": r[2], "vol": r[3],
             "words": r[4] or 0, "title": r[5] or "", "h1": r[6] or "",
             "reason": "drop_recovery"}
            for r in cur.fetchall()
            if r[0] not in recent_urls
        ]

    if not candidates:
        return None

    # Сортировка: объём × (21 - позиция) — чем выше объём и ближе к топ, тем приоритетнее
    candidates.sort(key=lambda x: x["vol"] * (21 - x["pos"]), reverse=True)
    return candidates[0]

# ── Шаг 2: Определить тип улучшения ─────────────────────────
def decide_action(target):
    """
    Что конкретно улучшать — зависит от состояния страницы.
    """
    words  = target["words"]
    pos    = target["pos"]
    title  = target["title"]
    h1     = target["h1"]

    # L1: плохой title (<30 или >65 символов)
    if len(title) < 30 or len(title) > 65:
        return "title_fix", "L1"

    # L1: H1 пустой или слишком короткий
    if len(h1) < 15:
        return "h1_fix", "L1"

    # L2: страница близко к топ-3 — добавить FAQ (хорошо работает для поз 4-10)
    if pos <= 10 and words > 400:
        return "faq_add", "L2"

    # L3: мало слов — расширить контент
    if words < 700:
        return "content_expand", "L3"

    # L4: страница в топ-5 — добавить schema
    if pos <= 5:
        return "schema_add", "L4"

    # L5: контент есть, позиция 11-20 — внутренние ссылки
    return "internal_link", "L5"

# ── Шаг 3: Найти .astro файл ────────────────────────────────
def url_to_astro(url):
    base = Path(REPO_DIR) / "src" / "pages"
    slug = url.lstrip("/")

    if not slug:
        f = base / "index.astro"
        return str(f) if f.exists() else None

    for candidate in [
        base / f"{slug}.astro",
        base / "blog" / f"{slug}.astro",
        base / "stati" / f"{slug}.astro",
    ]:
        if candidate.exists():
            return str(candidate)

    # Поиск по имени файла
    result = subprocess.run(
        ["find", str(base), "-name", f"{Path(slug).name}.astro"],
        capture_output=True, text=True
    )
    found = result.stdout.strip().splitlines()
    return found[0] if found else None

# ── Шаг 4: Загрузить правила из базы знаний ─────────────────
def load_relevant_rules(action_type):
    if not os.path.exists(RULES_FILE):
        return ""
    with open(RULES_FILE) as f:
        data = json.load(f)

    # Фильтруем по типу действия
    relevance_map = {
        "title_fix":       ["сниппет", "title", "snippet", "CTR", "клик"],
        "h1_fix":          ["заголовок", "h1", "структур"],
        "faq_add":         ["FAQ", "вопрос", "featured snippet"],
        "content_expand":  ["контент", "LSI", "объём", "слов", "текст"],
        "schema_add":      ["разметк", "schema", "JSON-LD", "микроданные"],
        "internal_link":   ["внутренн", "ссылк", "link"],
    }
    keywords = relevance_map.get(action_type, [])

    rules = []
    for item in data:
        for rule in item.get("rules", []):
            if any(kw.lower() in rule.lower() for kw in keywords):
                rules.append(f"[{item['source']}] {rule}")

    # Добавить общие правила если мало специфичных
    if len(rules) < 3:
        for item in data:
            for rule in item.get("rules", [])[:1]:
                if rule not in rules:
                    rules.append(f"[{item['source']}] {rule}")
            if len(rules) >= 5:
                break

    return "\n".join(rules[:8])

# ── Шаг 5: Запустить headless Claude ────────────────────────
ACTION_PROMPTS = {
    "title_fix": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — ТОЛЬКО исправить title и meta description:
- Главный ключ: «{keyword}» (объём {vol}/мес, текущая позиция {pos})
- Title должен быть 50-60 символов, содержать ключ в начале + USP
- Meta description 130-155 символов, призыв к действию
- Файл: {file}

Правила из базы знаний:
{rules}

НЕ трогай контент страницы. Только frontmatter: title и description.
В конце выведи: УЛУЧШЕНО: <что изменил, было→стало>""",

    "h1_fix": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — улучшить H1 и введение:
- Главный ключ: «{keyword}» (объём {vol}/мес, поз {pos})
- H1 должен содержать ключ, быть 40-70 символов
- Первый абзац: прямой ответ на запрос, 40-60 слов
- Файл: {file}

Правила:
{rules}

Меняй только H1 и первый абзац.
В конце: УЛУЧШЕНО: <что изменил>""",

    "faq_add": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — добавить FAQ-блок для featured snippet:
- Ключ: «{keyword}» (объём {vol}/мес, поз {pos} — близко к топ-3!)
- Добавь 4-5 реальных вопросов которые задают родители об IT-лагере
- Каждый ответ 40-60 слов (оптимально для featured snippet)
- Разметь <details>/<summary> ИЛИ секцией с h3-вопросами
- Файл: {file}

Правила из базы знаний:
{rules}

Добавь FAQ в конец основного контента, перед footer.
В конце: УЛУЧШЕНО: <сколько вопросов добавил, о чём>""",

    "content_expand": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — расширить контент страницы на 150-200 слов:
- Ключ: «{keyword}» (объём {vol}/мес, поз {pos})
- Сейчас на странице ~{words} слов — маловато для топ-3
- Добавь один новый раздел: конкретные факты об АйДаКемп + LSI-слова
- LSI для этой темы: добавь синонимы, связанные понятия
- Файл: {file}

Правила:
{rules}

Только добавить раздел — не переписывать существующий контент.
В конце: УЛУЧШЕНО: <что добавил, примерно сколько слов>""",

    "schema_add": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — добавить JSON-LD разметку:
- Ключ: «{keyword}» (поз {pos})
- Добавь подходящую schema.org разметку (Event, EducationalOrganization или FAQ)
- Для детского лагеря: Event с датами смен ИЛИ EducationalOrganization
- Файл: {file}

Правила:
{rules}

Добавь <script type="application/ld+json"> в <head>.
В конце: УЛУЧШЕНО: <какую схему добавил>""",

    "internal_link": """Используй скилл improve-content для страницы https://aidacamp.ru{url}.

Задача — добавить 2-3 внутренние ссылки:
- Ключ: «{keyword}» (поз {pos})
- Найди в тексте места где упоминаются: программы, цены, смены, запись
- Добавь анкорные ссылки на: /programmy, /stoimost, /smeny, /zapis
- Анкор должен содержать ключевые слова
- Файл: {file}

Правила:
{rules}

Только добавить ссылки в существующий текст — не менять контент.
В конце: УЛУЧШЕНО: <какие ссылки добавил, куда>""",
}

def run_claude(action_type, target, astro_file, rules):
    prompt_tpl = ACTION_PROMPTS.get(action_type, ACTION_PROMPTS["content_expand"])
    prompt = prompt_tpl.format(
        url     = target["url"],
        keyword = target["keyword"],
        vol     = target["vol"],
        pos     = target["pos"],
        words   = target["words"],
        file    = astro_file,
        rules   = rules,
    )

    result = subprocess.run(
        [CLAUDE,
         "--no-session-persistence", "--no-chrome",
         "--tools", "Bash,Read,Write,Edit,Glob,Grep,WebFetch",
         "--permission-mode", "bypassPermissions",
         "--max-turns", "25",
         "-p", prompt],
        capture_output=True, text=True, timeout=600,
        cwd=REPO_DIR
    )

    output  = (result.stdout or "") + (result.stderr or "")
    summary = ""
    m = re.search(r'УЛУЧШЕНО:\s*(.+)', output, re.IGNORECASE)
    if m:
        summary = m.group(1).strip()[:200]

    return result.returncode == 0, summary, output

# ── Шаг 6: Посчитать слова в файле ──────────────────────────
def count_words(filepath):
    try:
        with open(filepath) as f:
            text = f.read()
        # Убрать frontmatter и теги
        text = re.sub(r'---.*?---', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', ' ', text)
        return len(text.split())
    except Exception:
        return 0

# ── Шаг 7: Билд + деплой на dev ─────────────────────────────
def build_and_deploy_dev():
    r = subprocess.run(
        ["npm", "run", "build"],
        capture_output=True, text=True, cwd=REPO_DIR, timeout=300
    )
    if r.returncode != 0:
        return False, r.stderr[-500:]

    r = subprocess.run(
        ["./scripts/deploy.sh", "dev"],
        capture_output=True, text=True, cwd=REPO_DIR, timeout=120
    )
    return r.returncode == 0, r.stderr[-200:] if r.returncode != 0 else ""

# ── Шаг 8: Записать в kaizen_log ────────────────────────────
def log_to_db(conn, target, action_type, summary, words_before, words_after, status="deployed_dev"):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO seo_kaizen_log
          (url, keyword, volume, pos_before, action_type, action_detail,
           words_before, words_after, file_path, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        target["url"], target["keyword"], target["vol"], target["pos"],
        action_type, summary, words_before, words_after,
        target.get("file"), status
    ))
    row = cur.fetchone()
    conn.commit()
    return row[0] if row else None

# ── Главный цикл ─────────────────────────────────────────────
def main():
    log("=" * 50)
    log("SEO KAIZEN — старт")

    conn = psycopg2.connect(DB)

    # Выбрать цель
    target = pick_target(conn)
    if not target:
        log("Нет подходящих страниц для улучшения сегодня")
        tg("🔄 <b>SEO Кайдзен</b>: сегодня нет новых целей — все страницы уже улучшены недавно")
        return

    log(f"Цель: {target['url']} | ключ: {target['keyword']} | поз: {target['pos']} | vol: {target['vol']}")

    # Определить действие
    action_type, level = decide_action(target)
    log(f"Действие: {action_type} ({level})")

    # Найти файл
    astro_file = url_to_astro(target["url"])
    if not astro_file:
        log(f"Файл не найден для {target['url']}, пропускаем")
        tg(f"⚠️ Кайдзен: файл не найден для {target['url']}")
        conn.close()
        return
    target["file"] = astro_file
    log(f"Файл: {astro_file}")

    # Загрузить правила
    rules = load_relevant_rules(action_type)
    log(f"Правил: {len(rules.splitlines())}")

    # Подсчитать слова ДО
    words_before = count_words(astro_file)

    # TG: начинаем
    tg(f"🔄 <b>SEO Кайдзен #{date.today().strftime('%d.%m')}</b> запущен\n"
       f"Страница: <code>{target['url']}</code>\n"
       f"Ключ: «{target['keyword']}» (поз. {target['pos']}, vol {target['vol']:,})\n"
       f"Действие: {action_type} ({level})")

    # Запустить Claude
    log("Запускаю Claude...")
    success, summary, output = run_claude(action_type, target, astro_file, rules)

    if not success:
        log(f"Claude вернул ошибку")
        log_to_db(conn, target, action_type, "ошибка Claude", words_before, words_before, "cancelled")
        tg(f"❌ Кайдзен: Claude не смог улучшить <code>{target['url']}</code>")
        conn.close()
        return

    # Слова ПОСЛЕ
    words_after = count_words(astro_file)
    words_delta = words_after - words_before
    log(f"Улучшено: {summary} | слов: {words_before}→{words_after} ({'+' if words_delta>=0 else ''}{words_delta})")

    # Билд + деплой на dev
    log("Билд...")
    build_ok, build_err = build_and_deploy_dev()
    if not build_ok:
        log(f"Ошибка билда: {build_err}")
        tg(f"⚠️ Кайдзен: улучшение готово, но билд упал\n<code>{build_err}</code>")
        log_to_db(conn, target, action_type, summary, words_before, words_after, "done")
        conn.close()
        return

    # Записать в БД
    kaizen_id = log_to_db(conn, target, action_type, summary, words_before, words_after, "deployed_dev")
    conn.close()

    # TG: результат
    level_emoji = {"L1": "🔤", "L2": "❓", "L3": "📝", "L4": "🗂", "L5": "🔗"}
    dev_url = f"https://dev.aidacamp.ru{target['url']}"

    msg = (
        f"✅ <b>SEO Кайдзен #{date.today().strftime('%d.%m')} готов</b>\n\n"
        f"{level_emoji.get(level,'🔄')} <b>{action_type}</b> | {level}\n"
        f"📄 <code>{target['url']}</code>\n"
        f"🔑 «{target['keyword']}» • поз. {target['pos']} • vol {target['vol']:,}\n"
        f"📊 Слов: {words_before} → {words_after} ({'+' if words_delta>=0 else ''}{words_delta})\n"
        f"\n<i>{summary}</i>\n\n"
        f"🔍 Проверь: {dev_url}\n\n"
        f"Через 6 часов выкатится в прод автоматически.\n"
        f"Чтобы отменить — /cancel_kaizen"
    )
    tg(msg)

    # Сохранить kaizen_id для деплой-листенера
    with open("/tmp/kaizen_pending.json", "w") as f:
        json.dump({
            "kaizen_id": kaizen_id,
            "url": target["url"],
            "action": action_type,
            "summary": summary,
        }, f)

    log(f"Готово. Kaizen ID={kaizen_id}. Деплой-листенер стартует...")

    # Запустить деплой-листенер фоново
    subprocess.Popen(
        ["python3", f"{REPO_DIR}/scripts/seo-kaizen-deploy-listener.py"],
        cwd=REPO_DIR,
        stdout=open(f"{REPO_DIR}/logs/seo-kaizen-listener.log", "a"),
        stderr=subprocess.STDOUT
    )


if __name__ == "__main__":
    main()
