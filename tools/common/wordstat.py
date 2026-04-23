"""common/wordstat.py — Яндекс.Wordstat API v2.

Документация: https://yandex.ru/dev/wordstat/doc/
Токен: WORDSTAT_TOKEN (OAuth, тот же что Директ/Метрика)

Основные методы:
  wordsByPhrases      — частоты для списка фраз (до 1000 за запрос)
  phrasesByWord       — похожие фразы по ключевому слову
  wordsByPhrasesDynamic — динамика частоты по месяцам
"""
import json
import os
import urllib.request


def _token() -> str:
    return os.environ.get("WORDSTAT_TOKEN", os.environ.get("DIRECT_TOKEN", ""))


def wordstat(method: str, body: dict) -> dict:
    """Базовый вызов Wordstat API v2.

    method — 'wordsByPhrases' | 'phrasesByWord' | 'wordsByPhrasesDynamic'
    body   — параметры запроса (dict)
    """
    req = urllib.request.Request(
        f"https://api.wordstat.yandex.com/v2/{method}",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"OAuth {_token()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def get_frequencies(phrases: list[str], geo_id: int = 213) -> list[dict]:
    """Частоты для списка фраз. geo_id=213 — Москва, 0 — вся Россия.

    Возвращает: [{"phrase": str, "shows": int, "exact_shows": int}, ...]
    exact_shows — частота в кавычках ("!фраза").
    """
    results = []
    # API принимает до 1000 фраз за запрос, разбиваем батчами
    batch_size = 100
    for i in range(0, len(phrases), batch_size):
        batch = phrases[i:i + batch_size]
        try:
            data = wordstat("wordsByPhrases", {
                "phrases": [{"phrase": p} for p in batch],
                "geoId": [geo_id],
            })
            for item in data.get("data", []):
                phrase = item.get("phrase", "")
                shows_list = item.get("shows", [])
                shows = shows_list[0].get("value", 0) if shows_list else 0
                exact_list = item.get("exactShows", [])
                exact_shows = exact_list[0].get("value", 0) if exact_list else 0
                results.append({
                    "phrase": phrase,
                    "shows": shows,
                    "exact_shows": exact_shows,
                })
        except Exception as e:
            print(f"wordstat.get_frequencies batch {i} err: {e}")
    return results


def get_related(phrase: str, geo_id: int = 213, limit: int = 50) -> list[dict]:
    """Похожие фразы (phrasesByWord). Хорошо для расширения семантики.

    Возвращает: [{"phrase": str, "shows": int}, ...]
    """
    try:
        data = wordstat("phrasesByWord", {
            "phrase": phrase,
            "geoId": [geo_id],
            "pageSize": limit,
        })
        results = []
        for item in data.get("data", []):
            shows_list = item.get("shows", [])
            shows = shows_list[0].get("value", 0) if shows_list else 0
            results.append({"phrase": item.get("phrase", ""), "shows": shows})
        return sorted(results, key=lambda x: x["shows"], reverse=True)
    except Exception as e:
        print(f"wordstat.get_related err: {e}")
        return []


def get_dynamic(phrase: str, geo_id: int = 213, months: int = 12) -> list[dict]:
    """Динамика частоты по месяцам (wordsByPhrasesDynamic).

    Возвращает: [{"month": "2026-01", "shows": int}, ...]
    """
    try:
        data = wordstat("wordsByPhrasesDynamic", {
            "phrases": [{"phrase": phrase}],
            "geoId": [geo_id],
        })
        results = []
        for item in data.get("data", []):
            for point in item.get("shows", []):
                results.append({
                    "month": point.get("date", ""),
                    "shows": point.get("value", 0),
                })
        return results[-months:] if len(results) > months else results
    except Exception as e:
        print(f"wordstat.get_dynamic err: {e}")
        return []


def bulk_frequencies(phrases: list[str], geo_id: int = 0) -> dict[str, int]:
    """Быстрый словарь phrase→shows для большого списка. geo_id=0 — Россия."""
    rows = get_frequencies(phrases, geo_id=geo_id)
    return {r["phrase"]: r["shows"] for r in rows}
