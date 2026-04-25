"""common/db.py — PostgreSQL хелперы.

Единственное место где создаётся соединение с БД.
Все скрипты делают: from common.db import pg_connect, get_preference
"""
import os
import psycopg2


def pg_connect(dbname="aidacamp", user="postgres"):
    """Соединение с локальной PostgreSQL через Unix socket (peer auth, без пароля)."""
    return psycopg2.connect(dbname=dbname, user=user)


def get_preference(key: str, default=None, conn=None):
    """Читает значение из ai_user_preferences по ключу."""
    import re
    close_after = conn is None
    try:
        if conn is None:
            conn = pg_connect()
        cur = conn.cursor()
        cur.execute("SELECT value FROM ai_user_preferences WHERE key=%s LIMIT 1", (key,))
        row = cur.fetchone()
        cur.close()
        if row:
            m = re.search(r"(\d+\.?\d*)", row[0])
            if m:
                return type(default)(m.group(1)) if default is not None else m.group(1)
            return row[0]
    except Exception as e:
        print(f"db.get_preference({key}): {e}")
    finally:
        if close_after and conn:
            try:
                conn.close()
            except Exception:
                pass
    return default
