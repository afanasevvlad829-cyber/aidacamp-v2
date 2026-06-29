#!/usr/bin/env python3
"""
АйДаКемп — Video Pipeline
Запускается ЛОКАЛЬНО на маке (имеет доступ к Яндекс.Диску через secretctl).
Отбирает фото → скачивает → загружает на сервер → рендерит → шлёт в Telegram.

Использование:
  secretctl run -k Yandex_disk -- python3 scripts/camp-video.py --shift 3 --day 7
  secretctl run -k Yandex_disk -- python3 scripts/camp-video.py --shift 3 --day 7 --scenes "эмоции,награждение,занятие" --title "День хакатона"
"""

import argparse
import json
import os
import subprocess
import sys
import tempfile
import urllib.request
import urllib.parse
from pathlib import Path
from datetime import datetime

# ── Конфиг ──────────────────────────────────────────────────────────────
SERVER       = "root@159.194.223.55"
SSH_KEY      = os.path.expanduser("~/.ssh/aidacamp_prod")
REMOTE_DIR   = "/opt/remotion-camp"
YADISK_TOKEN = os.environ.get("YADISK_TOKEN", "")

SCENES_DEFAULT = ["эмоции", "занятие", "награждение"]
PHOTO_COUNT    = 8   # фото в ролике

# ── Логирование ──────────────────────────────────────────────────────────
def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

# ── Яндекс.Диск ──────────────────────────────────────────────────────────
def yadisk_get(path_or_url: str) -> dict:
    """GET-запрос к Яндекс.Диску API."""
    if path_or_url.startswith("http"):
        url = path_or_url
    else:
        url = "https://cloud-api.yandex.net/v1/disk/resources?" + \
              urllib.parse.urlencode({"path": path_or_url})
    req = urllib.request.Request(
        url, headers={"Authorization": f"OAuth {YADISK_TOKEN}"}
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def get_download_url(disk_path: str) -> str:
    """Получает временную ссылку для скачивания файла с Яндекс.Диска."""
    data = yadisk_get(
        "https://cloud-api.yandex.net/v1/disk/resources/download?" +
        urllib.parse.urlencode({"path": disk_path})
    )
    return data["href"]


def download_photo(disk_path: str, dest: Path) -> bool:
    """Скачивает фото с Яндекс.Диска в локальный файл."""
    try:
        url = get_download_url(disk_path)
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as r:
            dest.write_bytes(r.read())
        return True
    except Exception as e:
        log(f"  ⚠️  Не скачалось {Path(disk_path).name}: {e}")
        return False


# ── Подборка фото через MCP photos ───────────────────────────────────────
def get_best_photos(scenes: list[str], total: int) -> list[str]:
    """
    Вызывает MCP photos (локальный) для поиска лучших фото по сценам.
    Возвращает список путей disk:/...
    """
    paths = []
    per_scene = max(2, (total + len(scenes) - 1) // len(scenes))

    for scene in scenes:
        log(f"  Ищу сцену: {scene} (нужно {per_scene})")
        result = subprocess.run(
            ["python3", "-c", f"""
import subprocess, json, sys
sys.path.insert(0, '/Users/vladimirafanasev/MCP')
# Вызываем через yadisk.sh CLI
r = subprocess.run(
    ['bash', '/Users/vladimirafanasev/MCP/yadisk.sh', 'photos', 'best', '{scene}', '{per_scene}'],
    capture_output=True, text=True, env={{**__import__('os').environ, 'YADISK_TOKEN': '{YADISK_TOKEN}'}}
)
print(r.stdout)
"""],
            capture_output=True, text=True, timeout=20
        )
        # Парсим пути из вывода (формат: disk:/Медиа/...)
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith("disk:/") and line not in paths:
                paths.append(line)
                if len(paths) >= total:
                    break
        if len(paths) >= total:
            break

    log(f"Найдено путей: {len(paths)}")
    return paths[:total]


def get_best_photos_via_mcp_tool(scenes: list[str], total: int) -> list[str]:
    """
    Альтернатива: напрямую через MCP aidacamp-tools photos best.
    Используется когда yadisk.sh недоступен.
    """
    paths = []
    per_scene = max(2, (total + len(scenes) - 1) // len(scenes))

    for scene in scenes:
        # Вызываем mcp сервер напрямую
        result = subprocess.run(
            [
                "node", "/Users/vladimirafanasev/MCP/index.js",
                "photos", "best", scene, str(per_scene)
            ],
            capture_output=True, text=True, timeout=20,
            env={**os.environ, "YADISK_TOKEN": YADISK_TOKEN}
        )
        for line in result.stdout.splitlines():
            line = line.strip()
            if line.startswith("disk:/") and line not in paths:
                paths.append(line)

    return paths[:total]


# ── Загрузка на сервер ────────────────────────────────────────────────────
def upload_photos_to_server(local_dir: Path) -> str:
    """rsync локальной папки с фото на сервер. Возвращает remote путь."""
    remote_photos_dir = f"{REMOTE_DIR}/photos_upload"
    cmd = [
        "ssh", "-i", SSH_KEY, SERVER,
        f"mkdir -p {remote_photos_dir}"
    ]
    subprocess.run(cmd, check=True)

    cmd = [
        "rsync", "-avz", "--delete",
        "-e", f"ssh -i {SSH_KEY}",
        str(local_dir) + "/",
        f"{SERVER}:{remote_photos_dir}/"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"rsync failed: {result.stderr}")

    log(f"  Фото загружены в {remote_photos_dir}")
    return remote_photos_dir


# ── Рендер на сервере ─────────────────────────────────────────────────────
def render_on_server(
    remote_photos_dir: str,
    photo_files: list[str],
    shift: int,
    day: int,
    title: str,
    composition: str = "DailyRecap"
) -> str:
    """Запускает render.py на сервере, возвращает путь к готовому MP4."""

    # Строим список URL (file:// для локальных файлов на сервере)
    photo_urls = [
        f"file://{remote_photos_dir}/{Path(f).name}"
        for f in photo_files
    ]

    props = json.dumps({
        "photos": photo_urls,
        "dayNumber": day,
        "shiftNumber": shift,
        "title": title or f"Смена {shift} · День {day}",
    })

    ts = datetime.now().strftime("%Y%m%d_%H%M")
    output_name = f"daily_s{shift}_d{day}_{ts}.mp4"

    remote_cmd = (
        f"cd {REMOTE_DIR} && "
        f"source /opt/aidacamp-tools/etl/.env && "
        f"npx remotion render {composition} out/{output_name} "
        f"--props='{props}' --log=quiet"
    )

    log(f"Рендерю на сервере: {output_name}")
    result = subprocess.run(
        ["ssh", "-i", SSH_KEY, SERVER, remote_cmd],
        capture_output=True, text=True, timeout=300
    )

    if result.returncode != 0:
        log(f"❌ Ошибка рендера: {result.stderr[-300:]}")
        raise RuntimeError("Render failed")

    remote_output = f"{REMOTE_DIR}/out/{output_name}"
    log(f"✅ Готово: {remote_output}")
    return remote_output


def send_video_telegram(remote_path: str, caption: str):
    """Отправляет видео с сервера в Telegram (через команду на сервере)."""
    remote_cmd = f"""
source /opt/aidacamp-tools/etl/.env
python3 - << 'PYEOF'
import urllib.request, json, os
TOKEN = os.environ.get('TG_BOT_TOKEN', '')
CHAT  = os.environ.get('TG_CHAT_ID', '244314247')
if not TOKEN:
    print("Нет TG_BOT_TOKEN"); exit(1)

with open('{remote_path}', 'rb') as f:
    video = f.read()

boundary = 'AidaCampBoundary2026'
body = (
    f'--{{boundary}}\\r\\nContent-Disposition: form-data; name="chat_id"\\r\\n\\r\\n{{CHAT}}\\r\\n'
    f'--{{boundary}}\\r\\nContent-Disposition: form-data; name="caption"\\r\\n\\r\\n{caption}\\r\\n'
    f'--{{boundary}}\\r\\nContent-Disposition: form-data; name="video"; filename="recap.mp4"\\r\\nContent-Type: video/mp4\\r\\n\\r\\n'
).encode() + video + f'\\r\\n--{{boundary}}--\\r\\n'.encode()

req = urllib.request.Request(
    f'https://api.telegram.org/bot{{TOKEN}}/sendVideo',
    data=body,
    headers={{'Content-Type': f'multipart/form-data; boundary={{boundary}}'}}
)
with urllib.request.urlopen(req, timeout=60) as r:
    resp = json.loads(r.read())
    print('✅ Telegram OK' if resp.get('ok') else f'⚠️ {{resp}}')
PYEOF
"""
    result = subprocess.run(
        ["ssh", "-i", SSH_KEY, SERVER, remote_cmd],
        capture_output=True, text=True, timeout=90
    )
    log(result.stdout.strip() or result.stderr.strip())


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="АйДаКемп Video Pipeline")
    parser.add_argument("--shift",   type=int, default=3,
                        help="Номер смены (default: 3)")
    parser.add_argument("--day",     type=int, default=1,
                        help="День смены (default: 1)")
    parser.add_argument("--title",   type=str, default="",
                        help="Заголовок ролика")
    parser.add_argument("--scenes",  type=str,
                        default=",".join(SCENES_DEFAULT),
                        help=f"Сцены через запятую (default: {','.join(SCENES_DEFAULT)})")
    parser.add_argument("--photos",  type=int, default=PHOTO_COUNT,
                        help=f"Кол-во фото (default: {PHOTO_COUNT})")
    parser.add_argument("--no-tg",   action="store_true",
                        help="Не отправлять в Telegram")
    parser.add_argument("--dry-run", action="store_true",
                        help="Только подобрать фото, не рендерить")
    args = parser.parse_args()

    if not YADISK_TOKEN:
        log("❌ YADISK_TOKEN не задан. Запускай через:")
        log("   secretctl run -k Yandex_disk -- python3 scripts/camp-video.py ...")
        sys.exit(1)

    scenes = [s.strip() for s in args.scenes.split(",")]
    log(f"=== АйДаКемп Video Pipeline ===")
    log(f"Смена {args.shift} · День {args.day} · Сцены: {scenes}")

    # 1. Подбираем фото
    disk_paths = get_best_photos(scenes, args.photos)

    if not disk_paths:
        log("❌ Фото не найдены")
        sys.exit(1)

    if args.dry_run:
        log("=== DRY RUN — только подборка ===")
        for p in disk_paths:
            print(p)
        return

    # 2. Скачиваем локально во временную папку
    with tempfile.TemporaryDirectory(prefix="camp_video_") as tmpdir:
        tmp = Path(tmpdir)
        local_files = []

        log(f"Скачиваю {len(disk_paths)} фото с Яндекс.Диска...")
        for i, path in enumerate(disk_paths):
            ext = Path(path).suffix or ".jpg"
            dest = tmp / f"photo_{i:02d}{ext}"
            if download_photo(path, dest):
                local_files.append(str(dest))
                log(f"  [{i+1}/{len(disk_paths)}] ✓ {Path(path).name}")

        if not local_files:
            log("❌ Ни одного фото не скачалось")
            sys.exit(1)

        log(f"Скачано: {len(local_files)} фото")

        # 3. Загружаем на сервер
        remote_photos_dir = upload_photos_to_server(tmp)

        # 4. Рендерим
        remote_mp4 = render_on_server(
            remote_photos_dir, local_files,
            shift=args.shift,
            day=args.day,
            title=args.title,
        )

    # 5. Отправляем в Telegram
    if not args.no_tg:
        caption = (
            f"🏕 АйДаКемп · Смена {args.shift} · День {args.day}\n"
            f"{args.title or 'Дневные хайлайты'}\n"
            f"📸 {len(local_files)} лучших момента"
        )
        send_video_telegram(remote_mp4, caption)

    log("=== Готово ===")


if __name__ == "__main__":
    main()
