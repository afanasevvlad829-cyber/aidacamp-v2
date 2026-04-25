"""common/direct.py — Яндекс.Директ API v5.

Переиспользуется в: budget_pace, weekly_digest, daily_intelligence, critical_monitor.
"""
import json
import os
import urllib.error
import urllib.request


def _token() -> str:
    return os.environ.get("DIRECT_TOKEN", "")


def _login() -> str:
    return os.environ.get("DIRECT_LOGIN", "kv145")


def direct(service: str, method: str, params: dict) -> dict:
    """Универсальный вызов Директ API v5.

    service  — 'campaigns', 'adgroups', 'ads', 'keywords', 'reports', ...
    method   — 'get', 'add', 'update', 'delete', 'suspend', 'resume', 'archive'
    params   — тело запроса (dict → JSON)
    """
    body = json.dumps({"method": method, "params": params}).encode()
    req = urllib.request.Request(
        f"https://api.direct.yandex.com/json/v5/{service}",
        data=body,
        headers={
            "Authorization": f"Bearer {_token()}",
            "Client-Login": _login(),
            "Content-Type": "application/json; charset=utf-8",
            "Accept-Language": "ru",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def direct_report(
    field_names: list,
    date_from: str,
    date_to: str,
    report_type: str = "ACCOUNT_PERFORMANCE_REPORT",
    include_vat: str = "NO",
) -> list[dict]:
    """Запускает Reports API и возвращает список строк как dict (ключ→значение).

    Возвращает [] при 201/202 (отчёт ещё готовится — ждать не будем в sync-режиме).
    """
    report_name = f"report_{date_from}_{date_to}_{report_type[:8]}"
    body = {
        "params": {
            "SelectionCriteria": {"DateFrom": date_from, "DateTo": date_to},
            "FieldNames": field_names,
            "ReportName": report_name,
            "ReportType": report_type,
            "DateRangeType": "CUSTOM_DATE",
            "Format": "TSV",
            "IncludeVAT": include_vat,
            "IncludeDiscount": "NO",
        }
    }
    req = urllib.request.Request(
        "https://api.direct.yandex.com/json/v5/reports",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {_token()}",
            "Client-Login": _login(),
            "Content-Type": "application/json",
            "processingMode": "auto",
            "skipReportHeader": "true",
            "skipColumnHeader": "false",
            "skipReportSummary": "true",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            lines = r.read().decode("utf-8").strip().split("\n")
        if len(lines) < 2:
            return []
        headers = lines[0].split("\t")
        return [dict(zip(headers, line.split("\t"))) for line in lines[1:] if line.strip()]
    except urllib.error.HTTPError as e:
        if e.code in (201, 202):
            return []
        raise


def direct_spend(date_from: str, date_to: str) -> int:
    """Расходы Директа за период в рублях (без НДС)."""
    rows = direct_report(["Cost"], date_from, date_to)
    total = 0
    for row in rows:
        try:
            total += int(row.get("Cost", "0")) // 1_000_000
        except Exception:
            pass
    return total


def direct_spend_and_clicks(date_from: str, date_to: str) -> tuple[int, int]:
    """Расходы и клики Директа за период."""
    rows = direct_report(["Clicks", "Cost"], date_from, date_to)
    cost, clicks = 0, 0
    for row in rows:
        try:
            clicks += int(row.get("Clicks", "0"))
            cost += int(row.get("Cost", "0")) // 1_000_000
        except Exception:
            pass
    return cost, clicks
