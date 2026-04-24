"""common/yaxml.py — xmlstock.com прокси для Яндекс.XML и Wordstat.

Документация: https://xmlstock.com/
Credentials: XMLSTOCK_USER, XMLSTOCK_KEY (или передать явно)

Эндпоинты:
  yandex_live  — Яндекс живой поиск (SERP)
  yandex_xml   — Яндекс XML поиск
  google       — Google поиск
  wordstat     — Яндекс Wordstat (частотность)

Методы:
  search(query, endpoint, lr, num)       — один запрос
  search_batch(queries, endpoint, delay) — пакет с rate limit
  wordstat_freq(phrases, lr)             — частотность по списку фраз
  validate_credentials(user, key)        — проверка ключа
"""
import json
import os
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

XMLSTOCK_BASE = "https://xmlstock.com/yandex/xml/"

_DEFAULT_USER = "14181"
_DEFAULT_KEY  = "d4711d0959e735ab1e460b37f97a1e1f"


def _user() -> str:
    return os.environ.get("XMLSTOCK_USER", _DEFAULT_USER)


def _key() -> str:
    return os.environ.get("XMLSTOCK_KEY", _DEFAULT_KEY)


def _request(params: dict, timeout: int = 20) -> str:
    """Базовый GET-запрос к xmlstock, возвращает тело ответа."""
    qs = urllib.parse.urlencode(params)
    url = f"{XMLSTOCK_BASE}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8")


def search(query: str, endpoint: str = "yandex_live",
           lr: int = 213, num: int = 10) -> dict:
    """Один поисковый запрос.

    endpoint: yandex_live | yandex_xml | google
    lr: регион (213 = Москва, 1 = Россия)
    num: кол-во результатов (10, 20, 50, 100)

    Возвращает: {"query": str, "results": [{"title","url","snippet"}, ...], "raw": str}
    """
    endpoint_map = {
        "yandex_live": "yandex_live",
        "yandex_xml":  "yandex_xml",
        "google":      "google",
    }
    params = {
        "user":     _user(),
        "key":      _key(),
        "query":    query,
        "type":     endpoint_map.get(endpoint, "yandex_live"),
        "lr":       lr,
        "num":      num,
    }
    raw = _request(params)
    results = _parse_serp(raw)
    return {"query": query, "results": results, "raw": raw}


def search_batch(queries: list[str], endpoint: str = "yandex_live",
                 lr: int = 213, num: int = 10,
                 delay: float = 1.0) -> list[dict]:
    """Пакетный поиск с соблюдением rate limits.

    delay: пауза между запросами в секундах.
    Возвращает список результатов search().
    """
    results = []
    for i, query in enumerate(queries):
        try:
            res = search(query, endpoint=endpoint, lr=lr, num=num)
            results.append(res)
        except Exception as e:
            results.append({"query": query, "results": [], "error": str(e)})
        if i < len(queries) - 1:
            time.sleep(delay)
    return results


def wordstat_freq(phrases: list[str], lr: int = 213) -> list[dict]:
    """Частотность Яндекс Wordstat для списка фраз.

    lr: 213 = Москва, 0 или 1 = вся Россия.

    Возвращает: [{"phrase": str, "shows": int, "exact_shows": int}, ...]
    """
    results = []
    for phrase in phrases:
        try:
            params = {
                "user":  _user(),
                "key":   _key(),
                "query": phrase,
                "type":  "wordstat",
                "lr":    lr,
            }
            raw = _request(params)
            shows, exact = _parse_wordstat(raw, phrase)
            results.append({
                "phrase":       phrase,
                "shows":        shows,
                "exact_shows":  exact,
                "raw":          raw[:200],
            })
            time.sleep(0.3)
        except Exception as e:
            results.append({"phrase": phrase, "shows": 0, "exact_shows": 0, "error": str(e)})
    return results


def validate_credentials(user: str = "", key: str = "") -> bool:
    """Проверяет пару user/key. Возвращает True если ключ валиден."""
    u = user or _user()
    k = key or _key()
    try:
        raw = _request({"user": u, "key": k, "query": "test", "type": "wordstat", "lr": 213})
        return "<error" not in raw
    except Exception:
        return False


# ── Парсеры ────────────────────────────────────────────────────────────────────

def _parse_serp(xml_str: str) -> list[dict]:
    """Парсит XML SERP xmlstock → список результатов."""
    try:
        root = ET.fromstring(xml_str)
        results = []
        for doc in root.findall(".//doc"):
            url     = doc.findtext("url", "")
            title   = doc.findtext("title", "")
            snippet = doc.findtext("passages/passage", "") or doc.findtext("snippet", "")
            if url:
                results.append({"url": url, "title": title, "snippet": snippet})
        return results
    except Exception:
        return []


def _parse_wordstat(xml_str: str, phrase: str) -> tuple[int, int]:
    """Парсит XML Wordstat → (shows, exact_shows).

    xmlstock wordstat возвращает список похожих фраз.
    Ищем точное совпадение для нашей фразы.
    """
    try:
        root = ET.fromstring(xml_str)
        # Широкая частотность — основная таблица
        shows = 0
        exact = 0
        phrase_lower = phrase.lower().strip()

        for item in root.findall(".//wordstat-item"):
            word_text = (item.findtext("phrase", "") or "").lower().strip()
            cnt_text  = item.findtext("count", "0") or "0"
            try:
                cnt = int(cnt_text.replace(" ", "").replace("\xa0", ""))
            except ValueError:
                cnt = 0

            # Точное совпадение фразы
            if word_text == phrase_lower:
                shows = cnt
            # Кавычная форма "!фраза"
            if word_text == f'"{phrase_lower}"' or word_text == f"!{phrase_lower}":
                exact = cnt

        # Если не нашли точного — берём первую строку (она и есть наш запрос)
        if shows == 0:
            first = root.find(".//wordstat-item")
            if first is not None:
                cnt_text = first.findtext("count", "0") or "0"
                try:
                    shows = int(cnt_text.replace(" ", "").replace("\xa0", ""))
                except ValueError:
                    pass

        return shows, exact
    except Exception:
        return 0, 0
