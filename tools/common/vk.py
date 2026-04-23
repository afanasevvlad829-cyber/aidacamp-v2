"""common/vk.py — VK Реклама (myTarget API).

Переиспользуется в: budget_pace, weekly_digest, daily_intelligence, critical_monitor.

ВАЖНО: используем myTarget API (target.my.com), НЕ api.vk.com/method/ads.*.
Токен — Bearer, истекает через 24 ч. Обновляем через refresh_token.
Refresh хранится в VK_REFRESH_TOKEN в etl/.env.

Функция vk_refresh_token() — вызывать в начале скрипта если нужна свежая статистика.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta

_BASE = "https://target.my.com/api/v2"
_OAUTH = "https://target.my.com/api/v2/oauth2/token.json"
_ENV_FILE = "/opt/aidacamp-tools/etl/.env"


def _token() -> str:
    return os.environ.get("VK_TOKEN", "")


def _account_id() -> str:
    return os.environ.get("VK_ACCOUNT_ID", "")


def vk_get(path: str, params: dict | None = None) -> dict:
    """GET-запрос к myTarget API. path без /api/v2 (напр. '/ad_plans.json')."""
    qs = f"?{urllib.parse.urlencode(params)}" if params else ""
    req = urllib.request.Request(
        f"{_BASE}{path}{qs}",
        headers={"Authorization": f"Bearer {_token()}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def vk_post(path: str, payload: dict) -> dict:
    """POST-запрос к myTarget API."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{_BASE}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {_token()}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def vk_refresh_token() -> bool:
    """Обновляет VK_TOKEN через refresh_token. Пишет в env-файл и os.environ.

    Возвращает True при успехе, False при ошибке.
    client_credentials (generates fresh pair) используем ТОЛЬКО если refresh не работает.
    """
    refresh = os.environ.get("VK_REFRESH_TOKEN", "")
    client_id = os.environ.get("VK_CLIENT_ID", "")
    client_secret = os.environ.get("VK_CLIENT_SECRET", "")

    # Пробуем refresh_token
    if refresh:
        try:
            data = urllib.parse.urlencode({
                "grant_type": "refresh_token",
                "refresh_token": refresh,
                "client_id": client_id,
                "client_secret": client_secret,
            }).encode()
            req = urllib.request.Request(
                _OAUTH, data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                resp = json.loads(r.read())
            if "access_token" in resp:
                _save_tokens(resp["access_token"], resp.get("refresh_token", refresh))
                return True
        except Exception as e:
            print(f"vk.refresh_token err: {e}")

    # Fallback — client_credentials (расходует лимит!)
    if client_id and client_secret:
        try:
            data = urllib.parse.urlencode({
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            }).encode()
            req = urllib.request.Request(
                _OAUTH, data=data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            with urllib.request.urlopen(req, timeout=15) as r:
                resp = json.loads(r.read())
            if "access_token" in resp:
                tokens_left = resp.get("tokens_left", "?")
                print(f"⚠️ vk client_credentials used (tokens_left={tokens_left})")
                _save_tokens(resp["access_token"], resp.get("refresh_token", ""))
                return True
        except Exception as e:
            print(f"vk.client_credentials err: {e}")

    return False


def _save_tokens(access: str, refresh: str):
    """Обновляет VK_TOKEN и VK_REFRESH_TOKEN в os.environ и env-файле."""
    os.environ["VK_TOKEN"] = access
    if refresh:
        os.environ["VK_REFRESH_TOKEN"] = refresh

    # Перезаписываем env-файл
    try:
        with open(_ENV_FILE) as f:
            lines = f.readlines()

        new_lines = []
        found_token = found_refresh = False
        for line in lines:
            if line.startswith("VK_TOKEN="):
                new_lines.append(f"VK_TOKEN={access}\n")
                found_token = True
            elif line.startswith("VK_REFRESH_TOKEN=") and refresh:
                new_lines.append(f"VK_REFRESH_TOKEN={refresh}\n")
                found_refresh = True
            else:
                new_lines.append(line)
        if not found_token:
            new_lines.append(f"VK_TOKEN={access}\n")
        if not found_refresh and refresh:
            new_lines.append(f"VK_REFRESH_TOKEN={refresh}\n")
        with open(_ENV_FILE, "w") as f:
            f.writelines(new_lines)
        print(f"✅ VK tokens updated in env")
    except Exception as e:
        print(f"vk._save_tokens file err: {e}")


def vk_ensure_token() -> bool:
    """Проверяет токен — если невалиден, обновляет. Вызывать в начале скриптов."""
    try:
        # /user.json — лёгкий эндпоинт для проверки токена
        vk_get("/user.json")
        return True
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print("VK token expired, refreshing...")
            return vk_refresh_token()
        raise
    except Exception as e:
        print(f"vk.ensure_token err: {e}")
        return False


# ── Статистика ─────────────────────────────────────────────────────────────────

def _get_all_adplan_ids() -> list[str]:
    """Возвращает все ID кампаний (ad_plans) аккаунта постранично."""
    ids = []
    offset = 0
    limit = 50
    while True:
        try:
            data = vk_get("/ad_plans.json", {"_count": limit, "_offset": offset})
            items = data.get("items", [])
            ids += [str(p["id"]) for p in items]
            if len(items) < limit:
                break
            offset += limit
        except Exception as e:
            print(f"vk._get_all_adplan_ids err: {e}")
            break
    return ids


def vk_stats_period(date_from: str, date_to: str,
                    obj_type: str = "account", obj_id: str | None = None) -> dict:
    """Статистика за произвольный период через myTarget API.

    obj_type — 'account' (все ad_plans) | 'ad_plan' | 'campaign' (group) | 'banner'
    obj_id   — ID объекта или список через запятую (None → все ad_plans)
    Возвращает dict: {'spend': int, 'clicks': int, 'shows': int, 'ctr': float}
    """
    try:
        if obj_type == "account" or obj_id is None:
            # Берём все ad_plan ID и суммируем через total
            ids = _get_all_adplan_ids()
            if not ids:
                return {"spend": 0, "clicks": 0, "shows": 0, "ctr": 0}
            path = "/statistics/ad_plans/day.json"
            obj_id_str = ",".join(ids[:100])  # API лимит
        else:
            path = f"/statistics/{obj_type}s/day.json"
            obj_id_str = str(obj_id)

        data = vk_get(path, {
            "id": obj_id_str,
            "date_from": date_from,
            "date_to": date_to,
            "metrics": "base",
        })
        # Используем агрегированный total вместо items (быстрее)
        base = data.get("total", {}).get("base", {})
        spend = int(float(base.get("spent", 0)))
        clicks = int(base.get("clicks", 0))
        shows = int(base.get("shows", 0))
        ctr = round(clicks / shows * 100, 2) if shows else 0
        return {"spend": spend, "clicks": clicks, "shows": shows, "ctr": ctr}
    except Exception as e:
        print(f"vk.stats_period err: {e}")
        return {"spend": 0, "clicks": 0, "shows": 0, "ctr": 0}


def vk_spend(date_from: str, date_to: str) -> int:
    """Расходы VK за период в рублях."""
    return vk_stats_period(date_from, date_to)["spend"]


def vk_spend_and_clicks(date_from: str, date_to: str) -> tuple[int, int]:
    """Расходы и клики VK за период."""
    s = vk_stats_period(date_from, date_to)
    return s["spend"], s["clicks"]


# ── Кампании ───────────────────────────────────────────────────────────────────

def vk_campaigns(status: str | None = None, limit: int = 50) -> list[dict]:
    """Список кампаний (ad_plans). status='active'|'blocked'|None (все)."""
    params: dict = {"_count": limit}
    if status:
        params["status"] = status
    try:
        data = vk_get("/ad_plans.json", params)
        return data.get("items", [])
    except Exception as e:
        print(f"vk.campaigns err: {e}")
        return []
