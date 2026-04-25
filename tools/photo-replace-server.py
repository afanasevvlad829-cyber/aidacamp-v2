#!/usr/bin/env python3
"""
photo-replace-server.py — локальный тул для замены фото на сайте.

Запуск:
    cd /Users/vladimirafanasev/Aidacamp-cloude
    python3 tools/photo-replace-server.py
    # затем открыть http://localhost:8765 в браузере

Возможности:
  - Просмотр всех фото в public/images/ с превью + размер файла + разрешение
  - Сортировка: по размеру, по имени, по категории
  - Фильтр: «маленькие» (< 50KB) — кандидаты на замену
  - Drag-and-drop замена: бросаете фото на превью — оно заменяется
  - Автоматическая конверсия: входной JPG/PNG → AVIF (с сохранением имени)
  - Бэкап: старая версия сохраняется в public/images/.backup/<timestamp>/

Зависимости:
    pip3 install pillow pillow-avif-plugin
"""

import http.server
import socketserver
import json
import os
import shutil
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs, unquote
import io

PORT = 8765
ROOT = Path(__file__).resolve().parent.parent
IMAGES_DIR = ROOT / "public" / "images"
BACKUP_DIR = IMAGES_DIR / ".backup"

try:
    from PIL import Image
    try:
        import pillow_avif  # noqa
    except ImportError:
        print("⚠️  pillow-avif-plugin не установлен — AVIF-сохранение недоступно.")
        print("    pip3 install pillow-avif-plugin")
except ImportError:
    print("✖ Pillow не установлен. pip3 install pillow pillow-avif-plugin")
    sys.exit(1)


def get_image_info(path: Path):
    """Returns dict with size, dimensions, mtime."""
    try:
        size = path.stat().st_size
        mtime = path.stat().st_mtime
        try:
            with Image.open(path) as img:
                width, height = img.size
        except Exception:
            width, height = 0, 0
        return {
            "path": str(path.relative_to(ROOT)),
            "url": "/" + str(path.relative_to(ROOT / "public")),
            "name": path.name,
            "folder": str(path.parent.relative_to(IMAGES_DIR)) or ".",
            "size": size,
            "size_kb": round(size / 1024, 1),
            "width": width,
            "height": height,
            "mtime": mtime,
        }
    except Exception as e:
        return None


def list_images():
    """Recursively list all images in public/images/, excluding .backup."""
    images = []
    for ext in ("*.avif", "*.webp", "*.jpg", "*.jpeg", "*.png"):
        for p in IMAGES_DIR.rglob(ext):
            if ".backup" in p.parts:
                continue
            info = get_image_info(p)
            if info:
                images.append(info)
    return sorted(images, key=lambda x: x["size"])


def replace_image(target_path: Path, upload_bytes: bytes, target_format: str = "avif"):
    """Replace target image with uploaded bytes, converting to target_format.
    Backup the original. Returns (success, message)."""
    if not target_path.exists():
        return False, f"Target не существует: {target_path}"

    # Backup
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = BACKUP_DIR / ts / target_path.relative_to(IMAGES_DIR)
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target_path, backup_path)

    # Open uploaded image
    try:
        img = Image.open(io.BytesIO(upload_bytes))
    except Exception as e:
        return False, f"Не могу открыть загруженное фото: {e}"

    # Convert RGBA to RGB if saving as AVIF/JPG (no alpha)
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        img = bg
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # Save with format matching original extension
    target_format = target_path.suffix.lower().lstrip(".")
    save_kwargs = {}
    if target_format in ("avif",):
        save_kwargs = {"quality": 80}
    elif target_format in ("webp",):
        save_kwargs = {"quality": 85, "method": 6}
    elif target_format in ("jpg", "jpeg"):
        save_kwargs = {"quality": 85, "optimize": True, "progressive": True}
        target_format = "jpeg"
    elif target_format == "png":
        save_kwargs = {"optimize": True}

    try:
        img.save(target_path, format=target_format.upper() if target_format != "jpeg" else "JPEG", **save_kwargs)
        new_size = target_path.stat().st_size
        return True, f"OK ({new_size // 1024} KB), backup → {backup_path.relative_to(ROOT)}"
    except Exception as e:
        # Restore from backup on failure
        shutil.copy2(backup_path, target_path)
        return False, f"Save failed: {e}"


HTML_PAGE = """<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Photo Replace — AidaCamp</title>
<style>
  body { font-family: -apple-system, sans-serif; margin: 0; background: #f5f5f7; color: #111; }
  header { background: #0d1a2b; color: #fff; padding: 1rem 1.5rem; position: sticky; top: 0; z-index: 10; }
  header h1 { margin: 0; font-size: 1.2rem; }
  .controls { display: flex; gap: 1rem; padding: 1rem 1.5rem; background: #fff; border-bottom: 1px solid #e5e7eb; flex-wrap: wrap; }
  .controls input, .controls select { padding: 0.4rem 0.6rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; padding: 1.5rem; }
  .card { background: #fff; border-radius: 10px; padding: 0.8rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06); position: relative; }
  .card.dragover { box-shadow: 0 0 0 3px #ec7c00; background: #fff7ed; }
  .card.uploading { opacity: 0.5; }
  .card.success { box-shadow: 0 0 0 3px #16a34a; }
  .card.error { box-shadow: 0 0 0 3px #dc2626; }
  .img-wrap { aspect-ratio: 1; background: #f3f4f6; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 0.6rem; }
  .img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .meta { font-size: 12px; color: #6b7280; }
  .name { font-size: 13px; font-weight: 600; color: #111; word-break: break-all; margin-bottom: 0.2rem; }
  .size-warning { color: #dc2626; font-weight: 600; }
  .size-ok { color: #16a34a; }
  .folder-tag { display: inline-block; background: #eef2ff; color: #4f46e5; font-size: 10px; padding: 2px 6px; border-radius: 3px; margin-bottom: 0.3rem; }
  .status { font-size: 11px; margin-top: 0.4rem; padding: 0.3rem; border-radius: 4px; display: none; }
  .status.show { display: block; }
  .status.ok { background: #d1fae5; color: #065f46; }
  .status.err { background: #fee2e2; color: #991b1b; }
  .info { padding: 0.5rem 1.5rem; background: #fffbeb; color: #92400e; font-size: 13px; border-bottom: 1px solid #fde68a; }
</style>
</head>
<body>
<header>
  <h1>📸 Photo Replace — AidaCamp</h1>
</header>
<div class="info">
  <strong>Как пользоваться:</strong> перетащи новое фото на любую карточку — заменится с тем же именем + расширением.
  Оригинал сохраняется в <code>public/images/.backup/&lt;timestamp&gt;/</code>.
  Для деплоя на dev/prod после замены — <code>./scripts/deploy.sh dev</code>.
</div>
<div class="controls">
  <input type="text" id="search" placeholder="Поиск по имени..." style="flex: 1; min-width: 200px">
  <select id="sortBy">
    <option value="size-asc">Сначала маленькие (≤ кандидаты)</option>
    <option value="size-desc">Сначала большие</option>
    <option value="name">По имени</option>
    <option value="folder">По папке</option>
  </select>
  <select id="filterFolder">
    <option value="">Все папки</option>
  </select>
  <label style="display: flex; align-items: center; gap: 0.4rem; font-size: 13px;">
    <input type="checkbox" id="onlySmall"> Только < 50 KB
  </label>
</div>
<div class="grid" id="grid"></div>

<script>
let allImages = [];

async function loadImages() {
  const r = await fetch('/api/images');
  allImages = await r.json();
  populateFolders();
  render();
}

function populateFolders() {
  const folders = [...new Set(allImages.map(i => i.folder))].sort();
  const sel = document.getElementById('filterFolder');
  folders.forEach(f => {
    const o = document.createElement('option');
    o.value = f; o.textContent = f;
    sel.appendChild(o);
  });
}

function render() {
  const search = document.getElementById('search').value.toLowerCase();
  const sortBy = document.getElementById('sortBy').value;
  const folder = document.getElementById('filterFolder').value;
  const onlySmall = document.getElementById('onlySmall').checked;

  let imgs = allImages.filter(i => {
    if (search && !i.name.toLowerCase().includes(search)) return false;
    if (folder && i.folder !== folder) return false;
    if (onlySmall && i.size_kb > 50) return false;
    return true;
  });

  if (sortBy === 'size-asc') imgs.sort((a,b) => a.size - b.size);
  else if (sortBy === 'size-desc') imgs.sort((a,b) => b.size - a.size);
  else if (sortBy === 'name') imgs.sort((a,b) => a.name.localeCompare(b.name));
  else if (sortBy === 'folder') imgs.sort((a,b) => a.folder.localeCompare(b.folder) || a.name.localeCompare(b.name));

  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  imgs.forEach(img => grid.appendChild(card(img)));
}

function card(img) {
  const c = document.createElement('div');
  c.className = 'card';
  const tooSmall = img.width < 800 || img.size_kb < 30;
  c.innerHTML = `
    <div class="img-wrap"><img src="${img.url}" loading="lazy"></div>
    <span class="folder-tag">${img.folder}</span>
    <div class="name">${img.name}</div>
    <div class="meta">
      <span class="${tooSmall ? 'size-warning' : 'size-ok'}">${img.size_kb} KB</span> ·
      ${img.width}×${img.height}
    </div>
    <div class="status"></div>
  `;
  c.dataset.path = img.path;

  c.addEventListener('dragover', e => { e.preventDefault(); c.classList.add('dragover'); });
  c.addEventListener('dragleave', () => c.classList.remove('dragover'));
  c.addEventListener('drop', async e => {
    e.preventDefault();
    c.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    await uploadReplace(c, file);
  });
  return c;
}

async function uploadReplace(card, file) {
  const status = card.querySelector('.status');
  card.classList.add('uploading');
  card.classList.remove('success', 'error');
  status.className = 'status show';
  status.textContent = 'Загрузка...';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('target', card.dataset.path);

  try {
    const r = await fetch('/api/replace', { method: 'POST', body: fd });
    const data = await r.json();
    card.classList.remove('uploading');
    if (data.ok) {
      card.classList.add('success');
      status.className = 'status show ok';
      status.textContent = data.message;
      // refresh image preview
      const img = card.querySelector('img');
      img.src = img.src.split('?')[0] + '?v=' + Date.now();
      setTimeout(() => loadImages(), 1500); // refresh size info
    } else {
      card.classList.add('error');
      status.className = 'status show err';
      status.textContent = data.message;
    }
  } catch (err) {
    card.classList.remove('uploading');
    card.classList.add('error');
    status.className = 'status show err';
    status.textContent = err.message;
  }
}

['search', 'sortBy', 'filterFolder', 'onlySmall'].forEach(id => {
  document.getElementById(id).addEventListener('input', render);
});
loadImages();
</script>
</body></html>
"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        # quieter logging
        if "/api/" in args[0]:
            super().log_message(fmt, *args)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/" or u.path == "/index.html":
            body = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/api/images":
            data = json.dumps(list_images()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        # Static images: /images/...
        if u.path.startswith("/images/"):
            self.path = "/public" + u.path
            return super().do_GET()
        super().do_GET()

    def do_POST(self):
        u = urlparse(self.path)
        if u.path != "/api/replace":
            self.send_error(404)
            return

        # Parse multipart manually (small files, simple)
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            self._json(400, {"ok": False, "message": "expected multipart"})
            return

        boundary = ctype.split("boundary=")[1].encode()
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        parts = body.split(b"--" + boundary)
        target = None
        file_bytes = None
        for part in parts:
            if b"name=\"target\"" in part:
                target = part.split(b"\r\n\r\n")[1].rsplit(b"\r\n", 1)[0].decode("utf-8")
            elif b"name=\"file\"" in part:
                # find content-type then extract bytes
                head, _, content = part.partition(b"\r\n\r\n")
                file_bytes = content.rsplit(b"\r\n", 1)[0]

        if not target or not file_bytes:
            self._json(400, {"ok": False, "message": "missing target or file"})
            return

        target_path = ROOT / target
        # Safety: must be inside IMAGES_DIR
        try:
            target_path.resolve().relative_to(IMAGES_DIR.resolve())
        except ValueError:
            self._json(403, {"ok": False, "message": "target outside images dir"})
            return

        ok, msg = replace_image(target_path, file_bytes)
        self._json(200, {"ok": ok, "message": msg})

    def _json(self, code, obj):
        data = json.dumps(obj).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    print(f"Сервер: http://localhost:{PORT}")
    print(f"Images dir: {IMAGES_DIR}")
    print(f"Backup dir: {BACKUP_DIR}")
    print()
    print("Открой в браузере: http://localhost:" + str(PORT))
    print("Перетаскивай фото на карточки — будет замена с бэкапом.")
    print("Ctrl+C для остановки.")
    print()
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
