#!/usr/bin/env python3
"""
Генератор спек соответствия Labrika из выгрузки сборщика.

Вход: data.jsonl полного прогона labrika-content-collector
(на aidacamp-prod: /opt/labrika-content-collector, режим без
--recommendations-only — тогда в записи есть keyword_actions с диапазонами).

Выход: src/data/seo-spec/<slug>.json — по одной спеке на страницу.
Спека хранит ТОЛЬКО требования с диапазонами (что и сколько раз должно
встречаться), без HTML и тяжёлых полей. Проверка — scripts/check-seo-spec.py.

Запуск:
  scp aidacamp-prod:/opt/labrika-content-collector/outputs/<run>/data.jsonl /tmp/labrika-run.jsonl
  python3 scripts/seo-spec-generate.py /tmp/labrika-run.jsonl

Повторный запуск перезаписывает спеки затронутых страниц (обновление после
пересканирования Labrika); чужие спеки не трогает.
"""
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SPEC_DIR = ROOT / "src" / "data" / "seo-spec"


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src = Path(sys.argv[1])
    SPEC_DIR.mkdir(parents=True, exist_ok=True)
    written = empty = 0
    for line in src.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        d = json.loads(line)
        if d.get("error"):
            continue
        rec = d.get("recommendations") or {}
        keywords = rec.get("keyword_actions") or []
        spec = {
            "url": d["url"],
            "collected_at": d.get("collected_at"),
            "score_editor": (rec.get("scores") or {}).get("editor"),
            "score_site": (rec.get("scores") or {}).get("site"),
            "fields": rec.get("fields") or [],
            "keywords": [
                {
                    "keyword": k.get("keyword", ""),
                    "current": k.get("current"),
                    "range": k.get("range", ""),
                    "action": k.get("action"),
                    "delta": k.get("delta"),
                }
                for k in keywords
            ],
            "terms": rec.get("term_actions") or [],
        }
        if not spec["keywords"] and not spec["fields"] and not spec["terms"]:
            empty += 1
        slug = urlparse(d["url"]).path.strip("/").replace("/", "__") or "home"
        (SPEC_DIR / f"{slug}.json").write_text(
            json.dumps(spec, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )
        written += 1
    print(f"Спек записано: {written} (из них без требований: {empty}) → {SPEC_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
