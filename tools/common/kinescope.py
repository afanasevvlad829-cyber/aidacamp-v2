"""common/kinescope.py — Kinescope Video API.

Документация: https://kinescope.io/docs/api/
Токен: KINESCOPE_TOKEN (Bearer)

Основное использование:
  - Получить список видео проекта
  - Получить статистику просмотров
  - Получить embed-код / ссылку для вставки
  - Загрузить/удалить видео
"""
import json
import os
import urllib.parse
import urllib.request

_BASE = "https://api.kinescope.io/v1"


def _token() -> str:
    return os.environ.get("KINESCOPE_TOKEN", "")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {_token()}",
        "Content-Type": "application/json",
    }


def kinescope_get(path: str, params: dict | None = None) -> dict:
    """GET-запрос к Kinescope API."""
    qs = f"?{urllib.parse.urlencode(params)}" if params else ""
    req = urllib.request.Request(
        f"{_BASE}{path}{qs}",
        headers=_headers(),
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def kinescope_post(path: str, payload: dict) -> dict:
    """POST-запрос к Kinescope API."""
    req = urllib.request.Request(
        f"{_BASE}{path}",
        data=json.dumps(payload).encode(),
        headers=_headers(),
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


# ── Проекты ────────────────────────────────────────────────────────────────────

def list_projects(page: int = 1, per_page: int = 50) -> list[dict]:
    """Список проектов аккаунта."""
    try:
        data = kinescope_get("/projects", {"page": page, "per_page": per_page})
        return data.get("data", [])
    except Exception as e:
        print(f"kinescope.list_projects err: {e}")
        return []


# ── Видео ──────────────────────────────────────────────────────────────────────

def list_videos(project_id: str | None = None, page: int = 1, per_page: int = 50) -> list[dict]:
    """Список видео. project_id игнорируется — API возвращает все видео аккаунта через /videos."""
    try:
        data = kinescope_get("/videos", {"page": page, "per_page": per_page})
        return data.get("data", [])
    except Exception as e:
        print(f"kinescope.list_videos err: {e}")
        return []


def get_video(video_id: str) -> dict:
    """Метаданные конкретного видео."""
    try:
        data = kinescope_get(f"/videos/{video_id}")
        return data.get("data", {})
    except Exception as e:
        print(f"kinescope.get_video err: {e}")
        return {}


def video_embed_url(video_id: str) -> str:
    """Возвращает iframe embed URL для вставки на сайт."""
    return f"https://kinescope.io/embed/{video_id}"


def video_direct_url(video_id: str) -> str:
    """Прямая ссылка на видео-плеер."""
    return f"https://kinescope.io/{video_id}"


# ── Статистика ─────────────────────────────────────────────────────────────────

def video_stats(video_id: str, date_from: str = "", date_to: str = "") -> dict:
    """Статистика просмотров видео.

    Возвращает dict: {'views': int, 'play_rate': float, 'watch_time': int, ...}
    """
    try:
        params = {}
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to
        data = kinescope_get(f"/videos/{video_id}/stats", params or None)
        return data.get("data", {})
    except Exception as e:
        print(f"kinescope.video_stats err: {e}")
        return {}


def project_stats(project_id: str, date_from: str = "", date_to: str = "") -> dict:
    """Суммарная статистика по всем видео проекта."""
    try:
        params = {}
        if date_from:
            params["date_from"] = date_from
        if date_to:
            params["date_to"] = date_to
        data = kinescope_get(f"/projects/{project_id}/stats", params or None)
        return data.get("data", {})
    except Exception as e:
        print(f"kinescope.project_stats err: {e}")
        return {}


# ── Удобные хелперы ────────────────────────────────────────────────────────────

def get_all_videos(project_id: str | None = None) -> list[dict]:
    """Возвращает все видео аккаунта (с автопагинацией)."""
    all_videos = []
    page = 1
    while True:
        batch = list_videos(page=page, per_page=50)
        if not batch:
            break
        all_videos.extend(batch)
        if len(batch) < 50:
            break
        page += 1
    return all_videos


def video_summary(video_id: str) -> str:
    """Краткая строка с основной инфой о видео для логов/дайджестов."""
    v = get_video(video_id)
    s = video_stats(video_id)
    title = v.get("title", "?")
    duration = v.get("duration", 0)
    views = s.get("views", 0)
    return f"«{title}» {duration//60}:{duration%60:02d} — {views} просмотров"
