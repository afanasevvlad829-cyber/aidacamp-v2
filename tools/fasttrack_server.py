#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sqlite3
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError, HTTPError
from urllib.request import Request, urlopen


def to_bool(v: str | None) -> bool:
    return str(v or "").strip().lower() in {"1", "true", "yes", "on"}


def get_notify_cfg() -> tuple[str, str]:
    token = (os.getenv("AIDAPLUS_TELEGRAM_BOT_TOKEN") or "").strip()
    chat_id = (os.getenv("AIDAPLUS_TELEGRAM_CHAT_ID") or "").strip()
    return token, chat_id


def format_message(event: str, payload: dict) -> str:
    lines: list[str] = []
    if event == "booking_submitted":
        lines.append("AiDaCamp • Новая бронь")
        lines.append(f"Имя: {payload.get('name') or '—'}")
        lines.append(f"Телефон: {payload.get('phone') or '—'}")
        lines.append(f"Возраст: {payload.get('age') or '—'}")
        lines.append(f"Смена: {payload.get('shift_name') or payload.get('shift_date') or '—'}")
        lines.append(f"Цена: {payload.get('price_text') or '—'}")
        lines.append(f"Код: {payload.get('promo_code') or '—'}")
        lines.append(f"Режим: {payload.get('mode') or '—'}")
        lines.append(f"Отправлено: {payload.get('sent_at_local') or '—'}")
        return "\n".join(lines)
    lines.append(f"AiDaCamp • Event: {event or 'unknown'}")
    if payload:
        compact = {k: payload.get(k) for k in ("name", "phone", "age", "shift_name", "price_text", "mode")}
        lines.append(json.dumps(compact, ensure_ascii=False))
    return "\n".join(lines)


def send_to_telegram(event: str, payload: dict) -> dict:
    token, chat_id = get_notify_cfg()
    if not token or not chat_id:
        return {"ok": False, "delivered": False, "reason": "telegram_not_configured"}
    body = {
        "chat_id": chat_id,
        "text": format_message(event, payload),
        "disable_web_page_preview": True,
    }
    req = Request(
        url=f"https://api.telegram.org/bot{token}/sendMessage",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req, timeout=12) as resp:
            ok = resp.status == 200
            return {"ok": ok, "delivered": ok, "status": resp.status}
    except (HTTPError, URLError):
        return {"ok": False, "delivered": False, "reason": "telegram_network_error"}


def db_path() -> Path:
    raw = (os.getenv("AIDAPLUS_AB_DB_PATH") or "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(".runtime/ab_events.sqlite").resolve()


def init_ab_db() -> None:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS ab_events (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              event_ts TEXT NOT NULL,
              event_name TEXT NOT NULL,
              test_id TEXT NOT NULL,
              variant TEXT NOT NULL,
              session_id TEXT,
              visitor_id TEXT,
              page_path TEXT,
              page_url TEXT,
              referrer TEXT,
              utm_source TEXT,
              utm_medium TEXT,
              utm_campaign TEXT,
              utm_content TEXT,
              utm_term TEXT,
              device_type TEXT,
              payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ab_events_ts ON ab_events(event_ts)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ab_events_variant ON ab_events(test_id, variant)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_ab_events_name ON ab_events(event_name)")
        conn.commit()
    finally:
        conn.close()


def insert_ab_event(event_name: str, payload: dict) -> int:
    path = db_path()
    conn = sqlite3.connect(path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO ab_events (
              event_ts, event_name, test_id, variant, session_id, visitor_id,
              page_path, page_url, referrer, utm_source, utm_medium, utm_campaign,
              utm_content, utm_term, device_type, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(payload.get("event_ts") or ""),
                str(event_name or ""),
                str(payload.get("ab_test_id") or ""),
                str(payload.get("ab_variant") or ""),
                str(payload.get("session_id") or ""),
                str(payload.get("visitor_id") or ""),
                str(payload.get("page_path") or ""),
                str(payload.get("page_url") or ""),
                str(payload.get("referrer") or ""),
                str(payload.get("utm_source") or ""),
                str(payload.get("utm_medium") or ""),
                str(payload.get("utm_campaign") or ""),
                str(payload.get("utm_content") or ""),
                str(payload.get("utm_term") or ""),
                str(payload.get("device_type") or ""),
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
        return int(cur.lastrowid or 0)
    finally:
        conn.close()


def query_ab_summary(limit: int = 20) -> list[dict]:
    path = db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT
              test_id,
              variant,
              event_name,
              COUNT(*) AS events
            FROM ab_events
            GROUP BY test_id, variant, event_name
            ORDER BY events DESC
            LIMIT ?
            """,
            (max(1, min(int(limit), 200)),),
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


class Handler(SimpleHTTPRequestHandler):
    server_version = "fasttrack_server/1.0"

    def __init__(self, *args, directory: str, **kwargs):
        super().__init__(*args, directory=directory, **kwargs)

    def _write_json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if self.path.startswith("/api/lead") or self.path.startswith("/api/ab-event"):
            self.send_response(HTTPStatus.NO_CONTENT)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
            self.end_headers()
            return
        super().do_OPTIONS()

    def do_GET(self):
        if self.path == "/health":
            token, chat_id = get_notify_cfg()
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "service": "fasttrack_server",
                    "hasTelegramToken": bool(token),
                    "hasTelegramChatId": bool(chat_id),
                },
            )
            return
        if self.path.startswith("/api/ab-event/summary"):
            try:
                top = int((self.path.split("top=", 1)[1].split("&", 1)[0])) if "top=" in self.path else 20
            except ValueError:
                top = 20
            self._write_json(
                HTTPStatus.OK,
                {
                    "ok": True,
                    "top": top,
                    "rows": query_ab_summary(top),
                },
            )
            return
        super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/ab-event"):
            length = int(self.headers.get("Content-Length") or "0")
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                data = json.loads(raw.decode("utf-8") or "{}")
            except json.JSONDecodeError:
                self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
                return
            event = str(data.get("event") or "").strip()
            payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
            if not event:
                self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "event_required"})
                return
            if not payload.get("event_ts"):
                payload["event_ts"] = ""
            try:
                row_id = insert_ab_event(event, payload)
                self._write_json(HTTPStatus.OK, {"ok": True, "stored": True, "id": row_id})
                return
            except sqlite3.Error as error:
                self._write_json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "error": "db_error", "detail": str(error)})
                return

        if not self.path.startswith("/api/lead"):
            self._write_json(HTTPStatus.NOT_FOUND, {"ok": False, "error": "not_found"})
            return
        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._write_json(HTTPStatus.BAD_REQUEST, {"ok": False, "error": "invalid_json"})
            return
        event = str(data.get("event") or "").strip()
        payload = data.get("payload") if isinstance(data.get("payload"), dict) else {}
        result = send_to_telegram(event, payload)
        if result.get("ok"):
            self._write_json(HTTPStatus.OK, {"ok": True, "delivered": True, "endpoint": "telegram"})
            return
        self._write_json(HTTPStatus.SERVICE_UNAVAILABLE, {"ok": False, "delivered": False, **result})


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=4180)
    parser.add_argument("--root", default=".")
    args = parser.parse_args()

    root = str(Path(args.root).resolve())
    init_ab_db()
    httpd = ThreadingHTTPServer(
        (args.host, args.port),
        lambda *a, **k: Handler(*a, directory=root, **k),
    )
    print(
        json.dumps(
            {
                "ok": True,
                "service": "fasttrack_server",
                "root": root,
                "host": args.host,
                "port": args.port,
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    httpd.serve_forever()


if __name__ == "__main__":
    main()
