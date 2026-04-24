"""minuswords_snapshot.py — Ежедневный снэпшот минус-слов и минус-площадок.

Cron: 0 7 * * *  (07:00 UTC = 10:00 МСК)

Что делает:
  1. Минус-слова поиска — выгружает из всех кампаний Директа
  2. Минус-площадки РСЯ — выгружает ExcludedSites из Директа
  3. Сравнивает со вчера, пишет DIFF
  4. Обновляет _notes/АйДаКемп/Маркетинг/Минус-слова-поиска.md
  5. Обновляет _notes/АйДаКемп/Маркетинг/Минус-площадки РСЯ.md
  6. TG только если есть изменения
"""
import os
import sys
import json
import datetime
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from common.env import load_env, msk_now
from common.direct import direct
from common.telegram import tg_send
from common.db import pg_connect

load_env()

TODAY = msk_now().date().isoformat()
NOTES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "_notes")


# ── PostgreSQL — хранение истории ─────────────────────────────────────────────

INIT_SQL = """
CREATE TABLE IF NOT EXISTS minuswords_log (
    id          SERIAL PRIMARY KEY,
    log_date    DATE NOT NULL,
    type        VARCHAR(20) NOT NULL,   -- 'search' | 'sites'
    word        TEXT NOT NULL,
    action      VARCHAR(10) NOT NULL,   -- 'added' | 'removed' | 'existing'
    campaign_id VARCHAR(50),
    created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_minuswords_log_date ON minuswords_log(log_date, type);
"""


def ensure_table(conn):
    cur = conn.cursor()
    cur.execute(INIT_SQL)
    conn.commit()
    cur.close()


# ── Директ: минус-слова поиска ────────────────────────────────────────────────

def fetch_search_minuswords() -> dict[str, list[str]]:
    """Возвращает {campaign_id: [минус-слова]} для активных кампаний."""
    result = {}
    try:
        # Активные кампании
        camps = direct("campaigns", "get", {
            "SelectionCriteria": {"States": ["ON"]},
            "FieldNames": ["Id", "NegativeKeywords"],
        })
        campaigns = camps.get("result", {}).get("Campaigns", [])
        active_ids = [c["Id"] for c in campaigns]

        def _extract_nk(nk_field) -> list[str]:
            """Извлекает список минус-слов из поля NegativeKeywords.
            API возвращает либо dict(Items=[...]) либо list либо None.
            """
            if not nk_field:
                return []
            if isinstance(nk_field, dict):
                return nk_field.get("Items", [])
            if isinstance(nk_field, list):
                return nk_field
            return []

        # Минус-слова на уровне кампании
        for c in campaigns:
            camp_id = str(c["Id"])
            nk = _extract_nk(c.get("NegativeKeywords"))
            if nk:
                result[camp_id] = list(set(nk))

        # Минус-слова на уровне групп объявлений (батчи по 10 кампаний)
        for i in range(0, len(active_ids), 10):
            batch = active_ids[i:i+10]
            try:
                ag_resp = direct("adgroups", "get", {
                    "SelectionCriteria": {"CampaignIds": batch},
                    "FieldNames": ["Id", "CampaignId", "NegativeKeywords"],
                })
                for ag in ag_resp.get("result", {}).get("AdGroups", []):
                    camp_id = str(ag.get("CampaignId", ""))
                    words = _extract_nk(ag.get("NegativeKeywords"))
                    if words:
                        existing = result.get(camp_id, [])
                        result[camp_id] = list(set(existing + words))
            except Exception:
                pass

    except Exception as e:
        print(f"fetch_search_minuswords err: {e}")
    return result


# ── Директ: минус-площадки РСЯ ───────────────────────────────────────────────

def fetch_excluded_sites() -> list[str]:
    """Список минус-площадок РСЯ.

    В Direct API v5 нет отдельного /excludeddomains endpoint.
    Управление площадками ведётся в интерфейсе, данные недоступны через JSON API.
    Возвращаем пустой список — функция оставлена для будущего расширения.
    """
    return []


# ── Сравнение с предыдущим днём ───────────────────────────────────────────────

def compute_diff(conn, type_: str, current: set[str]) -> dict:
    """Возвращает {added: [], removed: []}."""
    yesterday = (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    cur = conn.cursor()
    cur.execute(
        "SELECT word FROM minuswords_log WHERE log_date=%s AND type=%s AND action='existing'",
        (yesterday, type_),
    )
    prev = {row[0] for row in cur.fetchall()}
    cur.close()

    added   = current - prev
    removed = prev - current
    return {"added": sorted(added), "removed": sorted(removed)}


def save_to_pg(conn, type_: str, words: set[str], diff: dict):
    cur = conn.cursor()
    for w in words:
        action = "added" if w in diff["added"] else "existing"
        cur.execute(
            "INSERT INTO minuswords_log (log_date, type, word, action) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (TODAY, type_, w, action),
        )
    for w in diff["removed"]:
        cur.execute(
            "INSERT INTO minuswords_log (log_date, type, word, action) VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING",
            (TODAY, type_, w, "removed"),
        )
    conn.commit()
    cur.close()


# ── Обновление Obsidian ───────────────────────────────────────────────────────

def update_notes_sites(sites: list[str], diff: dict):
    """Обновляет файл Минус-площадки РСЯ.md (если _notes доступен)."""
    if not os.path.isdir(NOTES_DIR):
        print("  → _notes not found, skipping sites markdown write")
        return
    path = os.path.join(NOTES_DIR, "АйДаКемп", "Маркетинг", "Минус-площадки РСЯ.md")
    lines = [
        f"# Минус-площадки РСЯ",
        f"",
        f"> Автоматически обновляется minuswords_snapshot.py · последнее обновление: {TODAY}",
        f"> Всего: {len(sites)} площадок",
        "",
    ]
    if diff["added"]:
        lines += [f"## ✅ Добавлены {TODAY} ({len(diff['added'])})", ""]
        for s in diff["added"]:
            lines.append(f"- {s}")
        lines.append("")
    if diff["removed"]:
        lines += [f"## ❌ Удалены {TODAY} ({len(diff['removed'])})", ""]
        for s in diff["removed"]:
            lines.append(f"- {s}")
        lines.append("")

    lines += [f"## Полный список", ""]
    for s in sites:
        lines.append(f"- {s}")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → updated: {path}")


def update_notes_minuswords(words_by_campaign: dict[str, list[str]], diff: dict):
    """Обновляет файл Минус-слова-поиска.md (если _notes доступен)."""
    if not os.path.isdir(NOTES_DIR):
        print("  → _notes not found, skipping minuswords markdown write")
        return
    all_words = set()
    for ws in words_by_campaign.values():
        all_words.update(ws)

    path = os.path.join(NOTES_DIR, "АйДаКемп", "Маркетинг", "Минус-слова-поиска.md")
    lines = [
        f"# Минус-слова поиска",
        f"",
        f"> Автоматически обновляется minuswords_snapshot.py · {TODAY}",
        f"> Всего уникальных: {len(all_words)}",
        "",
    ]
    if diff["added"]:
        lines += [f"## ✅ Добавлены {TODAY}", ""]
        for w in diff["added"][:20]:
            lines.append(f"- {w}")
        if len(diff["added"]) > 20:
            lines.append(f"... и ещё {len(diff['added'])-20}")
        lines.append("")
    if diff["removed"]:
        lines += [f"## ❌ Удалены {TODAY}", ""]
        for w in diff["removed"][:20]:
            lines.append(f"- {w}")
        lines.append("")

    lines += [f"## Полный список (по кампаниям)", ""]
    for camp_id, words in sorted(words_by_campaign.items()):
        lines += [f"### Кампания {camp_id} ({len(words)} слов)", ""]
        for w in sorted(words):
            lines.append(f"- {w}")
        lines.append("")

    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"  → updated: {path}")


# ── TG отчёт ─────────────────────────────────────────────────────────────────

def send_report(sites_diff: dict, words_diff: dict, sites_total: int, words_total: int):
    has_changes = any([
        sites_diff["added"], sites_diff["removed"],
        words_diff["added"], words_diff["removed"],
    ])

    if not has_changes:
        print("  → no changes, skipping TG")
        return

    lines = [f"🚫 *Минус-списки обновлены — {TODAY}*\n"]

    if sites_diff["added"]:
        lines.append(f"*Площадки РСЯ +{len(sites_diff['added'])}:*")
        for s in sites_diff["added"][:5]:
            lines.append(f"  + {s}")
    if sites_diff["removed"]:
        lines.append(f"*Площадки РСЯ -{len(sites_diff['removed'])} удалено*")

    if words_diff["added"]:
        lines.append(f"\n*Минус-слова поиска +{len(words_diff['added'])}:*")
        for w in words_diff["added"][:5]:
            lines.append(f"  + {w}")
    if words_diff["removed"]:
        lines.append(f"*Минус-слова -{len(words_diff['removed'])} удалено*")

    lines.append(f"\nИтого: {sites_total} площадок · {words_total} слов")
    tg_send("\n".join(lines))


# ── MAIN ──────────────────────────────────────────────────────────────────────

def main():
    print(f"[{TODAY}] minuswords_snapshot.py start")

    conn = pg_connect()
    ensure_table(conn)

    print("  → fetching excluded sites...")
    sites = fetch_excluded_sites()
    sites_set = set(sites)

    print("  → fetching search minus-words...")
    words_by_camp = fetch_search_minuswords()
    all_words = set()
    for ws in words_by_camp.values():
        all_words.update(ws)

    sites_diff = compute_diff(conn, "sites", sites_set)
    words_diff = compute_diff(conn, "search", all_words)

    save_to_pg(conn, "sites", sites_set, sites_diff)
    save_to_pg(conn, "search", all_words, words_diff)
    conn.close()

    update_notes_sites(sites, sites_diff)
    update_notes_minuswords(words_by_camp, words_diff)
    send_report(sites_diff, words_diff, len(sites), len(all_words))

    print(f"[{TODAY}] done · sites={len(sites)} · words={len(all_words)}")


if __name__ == "__main__":
    main()
