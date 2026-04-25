"""common/env.py — загрузка ENV, временные хелперы.

Единственное место где читается etl/.env и systemd-конфиг.
Все скрипты делают: from common.env import load_env, msk_now, date_str
"""
import os
from datetime import datetime, timedelta

try:
    from zoneinfo import ZoneInfo
    _MSK = ZoneInfo("Europe/Moscow")
except Exception:
    _MSK = None

_ENV_PATHS = [
    "/opt/aidacamp-tools/etl/.env",
    "/etc/systemd/system/crm-panel-api.service.d/env.conf",
]

def load_env():
    """Загружает переменные из файлов окружения. Idempotent — повторный вызов безопасен."""
    for path in _ENV_PATHS:
        try:
            with open(path) as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if line.startswith("Environment="):
                        for kv in line[len("Environment="):].strip('"').split():
                            if "=" in kv:
                                k, v = kv.split("=", 1)
                                os.environ.setdefault(k, v)
                    elif "=" in line:
                        k, v = line.split("=", 1)
                        os.environ.setdefault(k, v)
        except Exception:
            pass


def msk_now() -> datetime:
    if _MSK:
        return datetime.now(_MSK)
    return datetime.utcnow() + timedelta(hours=3)


def date_str(d) -> str:
    return d.strftime("%Y-%m-%d")


def week_bounds():
    """Возвращает (date_from, date_to, days_elapsed) для текущей недели пн–сегодня МСК."""
    now = msk_now()
    dow = now.weekday()          # Mon=0
    monday = (now - timedelta(days=dow)).date()
    today = now.date()
    days_elapsed = dow + 1
    return date_str(monday), date_str(today), days_elapsed


def is_quiet(hour: int, quiet_start=21, quiet_end=8) -> bool:
    return hour >= quiet_start or hour < quiet_end
