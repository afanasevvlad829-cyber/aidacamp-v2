"""common/metrika.py — Яндекс.Метрика API.

Переиспользуется в: budget_pace, weekly_digest, daily_intelligence, critical_monitor.

КРИТИЧЕСКИ ВАЖНО:
  НЕ используй metric ym:s:reaches + dimension ym:s:goalName → HTTP 400.
  Правильно: ym:s:goal{ID}reaches БЕЗ dimension.
  ID цели получай через Management API или используй fallback-константы.
"""
import json
import os
import urllib.parse
import urllib.request

# Счётчик АйДаКемп
COUNTER = os.environ.get("METRIKA_COUNTER", "96499295")

# Fallback: известные цели для счётчика 96499295
# Получены через Management API 2026-04-22
GOALS_FALLBACK: dict[str, int] = {
    "Отправка заявки-new": 541048197,
    "Выбор возраста-new": 541048270,
    "Клик в Telegram-new": 541048649,
}
LEAD_GOAL_ID = 541048197   # «Отправка заявки-new» — основная цель


def _token() -> str:
    return os.environ.get("METRIKA_TOKEN", "")


def metrika(metrics: str, date_from: str, date_to: str,
            dimensions: str = "", filters: str = "",
            limit: int = 1, offset: int = 1) -> dict:
    """Базовый запрос к Метрике stat/v1/data.

    metrics   — 'ym:s:visits,ym:s:goal541048197reaches'
    dimensions — 'ym:s:UTMSource' (если нужен breakdown)
    """
    params: dict = {
        "ids": COUNTER,
        "metrics": metrics,
        "date1": date_from,
        "date2": date_to,
        "limit": limit,
        "offset": offset,
    }
    if dimensions:
        params["dimensions"] = dimensions
    if filters:
        params["filters"] = filters

    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"https://api-metrika.yandex.net/stat/v1/data?{qs}",
        headers={"Authorization": f"OAuth {_token()}"},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def get_goal_ids() -> dict[str, int]:
    """Получает цели счётчика через Management API. При ошибке → GOALS_FALLBACK."""
    try:
        req = urllib.request.Request(
            f"https://api-metrika.yandex.net/management/v1/counter/{COUNTER}/goals",
            headers={"Authorization": f"OAuth {_token()}"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read())
        return {g["name"]: g["id"] for g in data.get("goals", [])}
    except Exception as e:
        print(f"metrika.get_goal_ids err: {e} → using fallback")
        return GOALS_FALLBACK


def metrika_leads(date_from: str, date_to: str, goal_id: int = LEAD_GOAL_ID) -> int:
    """Количество заявок за период (goal reaches)."""
    try:
        data = metrika(f"ym:s:goal{goal_id}reaches", date_from, date_to)
        totals = data.get("totals", [0])
        return int(totals[0]) if totals else 0
    except Exception as e:
        print(f"metrika.leads err: {e}")
        return 0


def metrika_visits_and_leads(date_from: str, date_to: str,
                              goal_id: int = LEAD_GOAL_ID) -> tuple[int, int]:
    """Визиты + заявки за период одним запросом."""
    try:
        data = metrika(f"ym:s:visits,ym:s:goal{goal_id}reaches", date_from, date_to)
        totals = data.get("totals", [0, 0])
        visits = int(totals[0]) if len(totals) > 0 else 0
        leads = int(totals[1]) if len(totals) > 1 else 0
        return visits, leads
    except Exception as e:
        print(f"metrika.visits_and_leads err: {e}")
        return 0, 0


def metrika_by_utm(date_from: str, date_to: str, limit: int = 50) -> list[dict]:
    """Разбивка визитов + заявок по UTM-источнику."""
    try:
        data = metrika(
            metrics=f"ym:s:visits,ym:s:goal{LEAD_GOAL_ID}reaches",
            date_from=date_from,
            date_to=date_to,
            dimensions="ym:s:UTMSource",
            limit=limit,
        )
        rows = []
        for item in data.get("data", []):
            dims = item.get("dimensions", [{}])
            vals = item.get("metrics", [0, 0])
            rows.append({
                "utm_source": dims[0].get("name", ""),
                "visits": int(vals[0]),
                "leads": int(vals[1]),
            })
        return rows
    except Exception as e:
        print(f"metrika.by_utm err: {e}")
        return []
