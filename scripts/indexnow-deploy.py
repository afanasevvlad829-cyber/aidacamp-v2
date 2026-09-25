#!/usr/bin/env python3
"""indexnow-deploy.py — после выката в прод отправляет в Яндекс (IndexNow) только
изменившиеся страницы.

Как определяем «изменилась». По собранному dist считаем хэш HTML каждой страницы
и сравниваем с манифестом прошлого выката (лежит на сервере). Ссылки на
/_astro/<хэш> в HTML нормализуются: смена одного CSS-файла не должна превращать
все 344 страницы в «изменённые». Отправляем только URL из sitemap (служебные и
noindex-страницы туда не попадают).

Первый запуск (манифеста нет) — ничего не шлёт, только записывает базовую линию.
Больше --max URL за раз режем по порядку sitemap: общий сдвиг (шапка, подвал)
меняет всё сразу, а Яндекс просит не спамить.

Запуск:
  python3 scripts/indexnow-deploy.py --dist dist/client --old-manifest old.json \
      --out-manifest new.json [--dry-run] [--max 200]

Всегда завершается с кодом 0, если сама отправка не удалась: переобход — бонус,
он не должен ронять деплой (шаг в workflow идёт с continue-on-error).
"""
import argparse
import hashlib
import json
import re
import sys
import urllib.request
from pathlib import Path

KEY = "f5bd0a7e08fa4610830ab6ea73abd373"
HOST = "aidacamp.ru"
ENDPOINT = "https://yandex.com/indexnow"
ASSET_RE = re.compile(r"/_astro/[^\"'\s)>]+")
LOC_RE = re.compile(r"<loc>\s*([^<\s]+)\s*</loc>")


def page_url(dist: Path, f: Path) -> str:
    rel = f.relative_to(dist).as_posix()
    if rel == "index.html":
        return f"https://{HOST}/"
    if rel.endswith("/index.html"):
        return f"https://{HOST}/{rel[: -len('index.html')]}"
    return f"https://{HOST}/{rel}"


def sitemap_urls(dist: Path) -> list[str]:
    urls: list[str] = []
    # build.sh переименовывает sitemap-0.xml в sitemap.xml и удаляет индекс
    for sm in sorted([*dist.glob("sitemap.xml"), *dist.glob("sitemap-[0-9]*.xml")]):
        urls += LOC_RE.findall(sm.read_text(encoding="utf-8"))
    return urls


def build_manifest(dist: Path) -> dict[str, str]:
    manifest = {}
    for f in dist.rglob("*.html"):
        html = f.read_text(encoding="utf-8", errors="replace")
        norm = ASSET_RE.sub("/_astro/X", html)
        manifest[page_url(dist, f)] = hashlib.sha1(norm.encode("utf-8")).hexdigest()
    return manifest


def send(urls: list[str]) -> bool:
    payload = json.dumps(
        {"host": HOST, "key": KEY, "keyLocation": f"https://{HOST}/{KEY}.txt", "urlList": urls},
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT, data=payload, headers={"Content-Type": "application/json; charset=utf-8"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"IndexNow: HTTP {r.status}, отправлено {len(urls)} URL")
            return r.status in (200, 202)
    except Exception as e:  # noqa: BLE001 — бонус-шаг, любая сетевая ошибка не фатальна
        print(f"IndexNow: отправка не удалась: {e}", file=sys.stderr)
        return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dist", required=True)
    ap.add_argument("--old-manifest", required=True)
    ap.add_argument("--out-manifest", required=True)
    ap.add_argument("--max", type=int, default=200)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    dist = Path(a.dist)
    new = build_manifest(dist)
    old_path = Path(a.old_manifest)
    old = json.loads(old_path.read_text()) if old_path.exists() and old_path.stat().st_size else None

    if old is None:
        print(f"IndexNow: манифеста нет — записываю базовую линию ({len(new)} страниц), ничего не шлю")
        Path(a.out_manifest).write_text(json.dumps(new, ensure_ascii=False))
        return 0

    in_sitemap = sitemap_urls(dist)
    changed = [u for u in in_sitemap if u in new and old.get(u) != new[u]]
    print(f"IndexNow: страниц в сборке {len(new)}, в sitemap {len(in_sitemap)}, изменилось {len(changed)}")

    to_send = changed[: a.max]
    if len(changed) > a.max:
        print(f"IndexNow: изменений больше лимита — шлю первые {a.max} по порядку sitemap, остальные {len(changed) - a.max} пропущены")

    sent_ok = True
    if to_send:
        if a.dry_run:
            print("DRY RUN, запрос не отправлен:\n" + "\n".join(to_send[:20]))
        else:
            sent_ok = send(to_send)

    # Манифест обновляем всегда: страницы, не ушедшие из-за лимита, попадут в «старые»
    # и вторично не отправятся — это осознанно, потерять их лучше, чем слать каждый выкат.
    if sent_ok or a.dry_run:
        Path(a.out_manifest).write_text(json.dumps(new, ensure_ascii=False))
    else:
        Path(a.out_manifest).write_text(json.dumps(old, ensure_ascii=False))
        print("IndexNow: манифест не обновлён — попробуем в следующий выкат")
    return 0


if __name__ == "__main__":
    sys.exit(main())
