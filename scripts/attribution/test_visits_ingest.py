import json
from visits_ingest import parse_line


def test_parse_first_visit_with_yclid():
    line = json.dumps({
        "ts": "2026-06-21T10:00:00+03:00", "ip": "1.2.3.4",
        "uri": "/?utm_source=yandex&yclid=ABC",
        "referer": "", "ua": "Mozilla", "lang": "ru",
        "aid_cookie": "", "request_id": "req123", "ym_uid": "",
        "args": "utm_source=yandex&yclid=ABC"})
    r = parse_line(line)
    assert r["visitor_id"] == "req123"   # cookie пуст -> request_id
    assert r["is_first"] is True         # cookie пуст -> первое касание
    assert r["utm_source"] == "yandex"
    assert r["yclid"] == "ABC"
    assert r["landing_url"] == "/?utm_source=yandex&yclid=ABC"


def test_parse_repeat_visit():
    line = json.dumps({
        "ts": "2026-06-21T10:05:00+03:00", "ip": "1.2.3.4", "uri": "/ceny",
        "referer": "https://aidacamp.ru/", "ua": "M", "lang": "ru",
        "aid_cookie": "req123", "request_id": "req999", "ym_uid": "ym1", "args": ""})
    r = parse_line(line)
    assert r["visitor_id"] == "req123"   # есть cookie -> он
    assert r["is_first"] is False


def test_bad_line_returns_none():
    assert parse_line("not json") is None


if __name__ == "__main__":
    # Запуск без pytest: python3 test_visits_ingest.py
    test_parse_first_visit_with_yclid()
    test_parse_repeat_visit()
    test_bad_line_returns_none()
    print("OK: 3 passed")
