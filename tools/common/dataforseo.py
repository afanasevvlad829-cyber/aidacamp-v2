"""common/dataforseo.py — DataForSEO REST API v3.

Документация: https://docs.dataforseo.com/v3/
Аутентификация: Basic (login:password в Base64)
Токены: DATAFORSEO_LOGIN, DATAFORSEO_KEY

Паттерн асинхронного запроса:
  1. task_post() → получаем task_id
  2. task_get(task_id) → ждём готовности, забираем результат

Для простых задач используй live-эндпоинты (task_post + instant result).
"""
import base64
import json
import os
import time
import urllib.request


def _auth() -> str:
    login = os.environ.get("DATAFORSEO_LOGIN", "")
    key   = os.environ.get("DATAFORSEO_KEY", "")
    return "Basic " + base64.b64encode(f"{login}:{key}".encode()).decode()


def dfs_post(endpoint: str, payload: list[dict]) -> dict:
    """POST-запрос к DataForSEO API.

    endpoint — путь без домена, напр. '/v3/serp/google/organic/task_post'
    payload  — список задач (каждая задача — dict с параметрами)
    """
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"https://api.dataforseo.com{endpoint}",
        data=data,
        headers={
            "Authorization": _auth(),
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def dfs_get(endpoint: str, params: dict | None = None) -> dict:
    """GET-запрос к DataForSEO API."""
    import urllib.parse
    qs = f"?{urllib.parse.urlencode(params)}" if params else ""
    req = urllib.request.Request(
        f"https://api.dataforseo.com{endpoint}{qs}",
        headers={"Authorization": _auth()},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


# ── SERP ───────────────────────────────────────────────────────────────────────

def serp_google(keyword: str, location_code: int = 2643743,
                language_code: str = "ru", device: str = "desktop",
                depth: int = 10) -> list[dict]:
    """Live SERP Google Organic для ключевого слова.

    location_code=2643743 — Россия (RU). Для Москвы: 1012812.
    Возвращает список органических результатов.
    """
    try:
        resp = dfs_post("/v3/serp/google/organic/live/advanced", [{
            "keyword": keyword,
            "location_code": location_code,
            "language_code": language_code,
            "device": device,
            "depth": depth,
        }])
        tasks = resp.get("tasks", [])
        if not tasks or tasks[0].get("status_code") != 20000:
            print(f"serp_google err: {tasks[0].get('status_message','?') if tasks else 'no tasks'}")
            return []
        results = tasks[0].get("result", [])
        items = results[0].get("items", []) if results else []
        return [i for i in items if i.get("type") == "organic"]
    except Exception as e:
        print(f"serp_google err: {e}")
        return []


def serp_positions(keyword: str, domain: str, **kwargs) -> int | None:
    """Позиция домена в выдаче Google по ключевому слову. None если не в топ-10."""
    items = serp_google(keyword, **kwargs)
    for item in items:
        url = item.get("url", "")
        if domain in url:
            return item.get("rank_absolute")
    return None


# ── Keyword Data ───────────────────────────────────────────────────────────────

def keyword_data(keywords: list[str], location_code: int = 2643743,
                 language_code: str = "ru") -> list[dict]:
    """Данные по ключевым словам: объём, CPC, конкуренция (Google Ads).

    Возвращает: [{"keyword": str, "search_volume": int, "cpc": float, "competition": float}, ...]
    """
    try:
        resp = dfs_post("/v3/keywords_data/google_ads/search_volume/live", [{
            "keywords": keywords[:700],  # лимит API
            "location_code": location_code,
            "language_code": language_code,
        }])
        tasks = resp.get("tasks", [])
        if not tasks or tasks[0].get("status_code") != 20000:
            return []
        results = tasks[0].get("result", [])
        return [{
            "keyword": r.get("keyword", ""),
            "search_volume": r.get("search_volume", 0),
            "cpc": r.get("cpc", 0),
            "competition": r.get("competition", 0),
        } for r in results]
    except Exception as e:
        print(f"keyword_data err: {e}")
        return []


def related_keywords(keyword: str, location_code: int = 2643743,
                     language_code: str = "ru", limit: int = 100) -> list[dict]:
    """Похожие ключевые слова (keyword ideas) через Google Ads API."""
    try:
        resp = dfs_post("/v3/keywords_data/google_ads/keywords_for_keywords/live", [{
            "keywords": [keyword],
            "location_code": location_code,
            "language_code": language_code,
            "limit": limit,
        }])
        tasks = resp.get("tasks", [])
        if not tasks or tasks[0].get("status_code") != 20000:
            return []
        results = tasks[0].get("result", [])
        return [{
            "keyword": r.get("keyword", ""),
            "search_volume": r.get("search_volume", 0),
            "cpc": r.get("cpc", 0),
        } for r in (results or [])]
    except Exception as e:
        print(f"related_keywords err: {e}")
        return []


# ── On-Page ────────────────────────────────────────────────────────────────────

def onpage_audit(domain: str, max_crawl_pages: int = 100,
                 load_resources: bool = False) -> str | None:
    """Запускает On-Page аудит домена. Возвращает task_id для последующего получения."""
    try:
        resp = dfs_post("/v3/on_page/task_post", [{
            "target": domain,
            "max_crawl_pages": max_crawl_pages,
            "load_resources": load_resources,
        }])
        tasks = resp.get("tasks", [])
        if tasks and tasks[0].get("status_code") == 20100:
            return tasks[0].get("id")
        print(f"onpage_audit err: {tasks[0].get('status_message','?') if tasks else 'no tasks'}")
        return None
    except Exception as e:
        print(f"onpage_audit err: {e}")
        return None


def onpage_summary(task_id: str, wait: bool = True,
                   poll_interval: int = 10, timeout: int = 120) -> dict:
    """Получает сводку аудита. При wait=True ждёт завершения (до timeout сек)."""
    elapsed = 0
    while True:
        try:
            resp = dfs_get(f"/v3/on_page/summary/{task_id}")
            tasks = resp.get("tasks", [])
            if tasks and tasks[0].get("status_code") == 20000:
                result = tasks[0].get("result", [{}])
                return result[0] if result else {}
        except Exception as e:
            print(f"onpage_summary err: {e}")
            return {}
        if not wait or elapsed >= timeout:
            return {}
        time.sleep(poll_interval)
        elapsed += poll_interval


# ── Backlinks ──────────────────────────────────────────────────────────────────

def backlinks_summary(domain: str) -> dict:
    """Сводка по бэклинкам домена: total_count, referring_domains, rank."""
    try:
        resp = dfs_post("/v3/backlinks/summary/live", [{
            "target": domain,
            "include_subdomains": True,
        }])
        tasks = resp.get("tasks", [])
        if not tasks or tasks[0].get("status_code") != 20000:
            return {}
        results = tasks[0].get("result", [{}])
        return results[0] if results else {}
    except Exception as e:
        print(f"backlinks_summary err: {e}")
        return {}


def competitors_domain(domain: str, limit: int = 10) -> list[dict]:
    """Конкуренты домена по пересечению ключевых слов."""
    try:
        resp = dfs_post("/v3/backlinks/competitors/live", [{
            "target": domain,
            "limit": limit,
        }])
        tasks = resp.get("tasks", [])
        if not tasks or tasks[0].get("status_code") != 20000:
            return []
        results = tasks[0].get("result", [{}])
        return results[0].get("items", []) if results else []
    except Exception as e:
        print(f"competitors_domain err: {e}")
        return []
