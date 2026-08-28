#!/usr/bin/env python3
"""visits-ingest: парсит nginx attribution.log -> INSERT visits (источник считает fn_classify_source).
Боевой путь: /opt/etl/visits_ingest.py (systemd-timer раз в минуту). Это репо-референс.
psycopg2 импортируется лениво — parse_line тестируется без БД."""
import json, os, sys
from urllib.parse import parse_qs

OFFSET_FILE = os.environ.get("VISITS_OFFSET_FILE", "/opt/etl/.visits-ingest.offset")
LOG = os.environ.get("VISITS_LOG", "/var/log/nginx/attribution.log")
DSN = os.environ.get("DB_DSN", "dbname=aidacamp user=postgres")


import re

# Шум: краулеры (по User-Agent) и не-страницы (ассеты по расширению URL).
# Отсекаем В МОМЕНТ ЗАПИСИ, чтобы сырая visits не копила ~59% мусора.
_BOT_RE = re.compile(r"bot|crawl|spider|externalagent|amazonbot|ahrefs|semrush|duckduck|preview|monitor|uptime|python|curl|wget|go-http|go\.d\.plugin|netdata|prometheus|zabbix|pingdom|statuscake|java/|okhttp|headless|phantom|slurp|bingpreview|facebookexternalhit", re.I)
_ASSET_RE = re.compile(r"\.(json|webmanifest|xml|txt|ico|css|js|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|map|mp4|webm|pdf)(\?|$)", re.I)

def is_noise(ua: str, uri: str) -> bool:
    """True если это краулер или технический ассет, а не живой просмотр страницы."""
    if ua and _BOT_RE.search(ua):
        return True
    if uri and _ASSET_RE.search(uri):
        return True
    return False


def parse_line(line: str):
    """JSON-строка лога -> dict для INSERT (или None если не парсится)."""
    try:
        d = json.loads(line)
    except Exception:
        return None
    q = parse_qs(d.get("args", ""))
    g = lambda k: (q.get(k) or [None])[0]
    aid = d.get("aid_cookie") or ""
    return {
        "visitor_id": aid or d.get("request_id"),
        "is_first": aid == "",
        "ts": d.get("ts"),
        "landing_url": d.get("uri"), "referer": d.get("referer") or None,
        "utm_source": g("utm_source"), "utm_medium": g("utm_medium"),
        "utm_campaign": g("utm_campaign"), "utm_content": g("utm_content"), "utm_term": g("utm_term"),
        "yclid": g("yclid"), "gclid": g("gclid"), "ysclid": g("ysclid"),
        "ip": d.get("ip") or None, "user_agent": d.get("ua") or None,
        "accept_lang": d.get("lang") or None, "ym_uid": d.get("ym_uid") or None,
    }


def insert(cur, r):
    # Дедуп: is_first всегда; повторный визит — не чаще 1/30мин на visitor (граница сессии)
    if not r["is_first"]:
        cur.execute(
            "SELECT 1 FROM visits WHERE visitor_id=%s AND ts > now()-interval '30 min' LIMIT 1",
            (r["visitor_id"],),
        )
        if cur.fetchone():
            return
    cur.execute(
        """
        INSERT INTO visits (visitor_id, ts, is_first, landing_url, referer,
          utm_source, utm_medium, utm_campaign, utm_content, utm_term,
          yclid, gclid, ysclid, ip, user_agent, accept_lang, ym_uid, source)
        VALUES (%(visitor_id)s, %(ts)s, %(is_first)s, %(landing_url)s, %(referer)s,
          %(utm_source)s,%(utm_medium)s,%(utm_campaign)s,%(utm_content)s,%(utm_term)s,
          %(yclid)s,%(gclid)s,%(ysclid)s,%(ip)s,%(user_agent)s,%(accept_lang)s,%(ym_uid)s,
          fn_classify_source(%(yclid)s,%(gclid)s,%(ysclid)s,%(utm_source)s,%(referer)s,%(landing_url)s))
        """,
        r,
    )


def main():
    import psycopg2  # ленивый импорт — нужен только при реальном прогоне
    try:
        off = int(open(OFFSET_FILE).read().strip())
    except Exception:
        off = 0
    if not os.path.exists(LOG):
        return
    if os.path.getsize(LOG) < off:
        off = 0  # лог ротировался
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    with open(LOG) as f:
        f.seek(off)
        for line in f:
            r = parse_line(line)
            if r and is_noise(r.get("user_agent") or "", r.get("landing_url") or ""):
                continue
            if r and r.get("visitor_id"):
                try:
                    insert(cur, r)
                except Exception as e:
                    print("skip:", e, file=sys.stderr)
        new_off = f.tell()
    conn.commit()
    cur.close()
    conn.close()
    with open(OFFSET_FILE, "w") as fo:
        fo.write(str(new_off))


if __name__ == "__main__":
    main()
