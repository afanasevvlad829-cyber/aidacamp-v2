#!/usr/bin/env python3
"""
photo-replace-server.py — локальный тул для замены фото.

v2:
  - Только фото, реально упоминаемые в src/**
  - Группировка вариантов (foo.avif/foo.webp/foo-768/-1080/-1440 = одна карточка)
  - При замене — генерирует все варианты исходных размеров
  - По умолчанию скрыты UI-папки (icons/team/mentors/cards/reviews/articles/thumbs)
"""

import http.server
import socketserver
import json
import re
import shutil
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
import io

PORT = 8765
ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = ROOT / "public"
IMAGES_DIR = PUBLIC_DIR / "images"
BACKUP_DIR = IMAGES_DIR / ".backup"

SRC_GLOBS = (
    "src/**/*.astro", "src/**/*.ts", "src/**/*.tsx",
    "src/**/*.js", "src/**/*.jsx", "src/**/*.mjs",
    "src/**/*.json", "src/**/*.md", "src/**/*.mdx",
)

IMAGE_REF_RE = re.compile(
    r"['\"`]?(?:/?images/[^\s'\"`)<>?#]+?\.(?:avif|webp|jpg|jpeg|png))(?:[?#][^'\"`)<>\s]*)?['\"`]?",
    re.IGNORECASE,
)
DYNAMIC_REF_RE = re.compile(
    r"['\"`](/?images/[A-Za-z0-9_\-/.]+?)['\"`]\s*[\+,)\]]",
    re.IGNORECASE,
)

UI_FOLDER_PREFIXES = (
    "images/icons", "images/team", "images/mentors",
    "images/cards", "images/reviews", "images/articles",
)
UI_FOLDER_SUBSTR = ("/thumbs", "/jpg")  # любые поддиректории thumbs/jpg

try:
    from PIL import Image
    try:
        import pillow_avif  # noqa
    except ImportError:
        print("⚠️  pillow-avif-plugin не установлен")
except ImportError:
    print("✖ Pillow не установлен. pip install pillow pillow-avif-plugin")
    sys.exit(1)


def collect_used_images():
    used = set()
    for pattern in SRC_GLOBS:
        for f in ROOT.glob(pattern):
            try:
                text = f.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            for m in IMAGE_REF_RE.findall(text):
                p = m.strip("'\"`").lstrip("/")
                if p.startswith("images/"):
                    used.add(p)
            for m in DYNAMIC_REF_RE.findall(text):
                stem = m.lstrip("/")
                if stem.startswith("images/"):
                    base = (PUBLIC_DIR / stem)
                    parent = base.parent
                    name = base.name
                    if parent.is_dir():
                        for p in parent.iterdir():
                            if p.is_file() and p.stem.startswith(name) and p.suffix.lower() in (".avif", ".webp", ".jpg", ".jpeg", ".png"):
                                used.add(str(p.relative_to(PUBLIC_DIR)))
    return used


def is_ui_path(rel_path: str) -> bool:
    if any(rel_path.startswith(pref) for pref in UI_FOLDER_PREFIXES):
        return True
    if any(s in rel_path for s in UI_FOLDER_SUBSTR):
        return True
    return False


def group_key(rel_path: str) -> str:
    """Объединяет варианты: hero-desktop-1080.avif → hero-desktop, hero-desktop.webp → hero-desktop."""
    p = Path(rel_path)
    stem = p.stem
    stem = re.sub(r"-\d{3,4}$", "", stem)
    stem = re.sub(r"@2x$", "", stem)
    return str(p.parent / stem)


def get_image_info(rel_path: str):
    p = PUBLIC_DIR / rel_path
    try:
        size = p.stat().st_size
        try:
            with Image.open(p) as img:
                w, h = img.size
        except Exception:
            w, h = 0, 0
        return {
            "rel": rel_path,
            "url": "/" + rel_path,
            "name": p.name,
            "ext": p.suffix.lower().lstrip("."),
            "size": size,
            "size_kb": round(size / 1024, 1),
            "width": w,
            "height": h,
        }
    except Exception:
        return None


def list_grouped(include_ui=False):
    used = collect_used_images()
    existing = [p for p in used if (PUBLIC_DIR / p).is_file()]
    if not include_ui:
        existing = [p for p in existing if not is_ui_path(p)]
    groups = {}
    for rel in existing:
        info = get_image_info(rel)
        if not info:
            continue
        key = group_key(rel)
        groups.setdefault(key, []).append(info)
    result = []
    for key, variants in groups.items():
        variants.sort(key=lambda v: -v["size"])
        main = variants[0]
        total_size = sum(v["size"] for v in variants)
        folder = str(Path(key).parent)
        if folder == ".":
            folder = "root"
        result.append({
            "key": key,
            "folder": folder,
            "name": Path(key).name,
            "preview": main["url"],
            "preview_w": main["width"],
            "preview_h": main["height"],
            "variants": variants,
            "variant_count": len(variants),
            "total_size_kb": round(total_size / 1024, 1),
        })
    result.sort(key=lambda g: g["total_size_kb"])
    return result


SIZE_RE = re.compile(r"-(\d{3,4})$")


def variant_target_dims(stem: str, src_w: int, src_h: int):
    m = SIZE_RE.search(stem)
    if not m:
        return None
    target_w = int(m.group(1))
    if src_w == 0:
        return (target_w, target_w)
    return (target_w, round(src_h * target_w / src_w))


def save_image(img, target_path: Path):
    fmt = target_path.suffix.lower().lstrip(".")
    save_kwargs = {}
    save_format = fmt.upper()
    if fmt == "avif":
        save_kwargs = {"quality": 80}
    elif fmt == "webp":
        save_kwargs = {"quality": 85, "method": 6}
    elif fmt in ("jpg", "jpeg"):
        save_kwargs = {"quality": 85, "optimize": True, "progressive": True}
        save_format = "JPEG"
    elif fmt == "png":
        save_kwargs = {"optimize": True}
    if fmt in ("avif", "jpg", "jpeg") and img.mode in ("RGBA", "LA", "P"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = bg
    elif fmt in ("avif", "jpg", "jpeg") and img.mode != "RGB":
        img = img.convert("RGB")
    img.save(target_path, format=save_format, **save_kwargs)


def replace_group(group_key_str: str, upload_bytes: bytes):
    groups = list_grouped(include_ui=True)
    group = next((g for g in groups if g["key"] == group_key_str), None)
    if not group:
        return False, f"Группа не найдена: {group_key_str}"
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = BACKUP_DIR / ts
    try:
        src_img = Image.open(io.BytesIO(upload_bytes))
        src_img.load()
    except Exception as e:
        return False, f"Не открыть фото: {e}"
    src_w, src_h = src_img.size
    replaced = []
    errors = []
    for variant in group["variants"]:
        target_path = PUBLIC_DIR / variant["rel"]
        if not target_path.is_file():
            continue
        backup_path = backup_root / variant["rel"]
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(target_path, backup_path)
        try:
            stem = target_path.stem
            dims = variant_target_dims(stem, src_w, src_h)
            if dims:
                tw = dims[0]
                ratio = tw / src_w if src_w else 1
                th = round(src_h * ratio)
                resized = src_img.resize((tw, th), Image.LANCZOS)
                save_image(resized, target_path)
            else:
                save_image(src_img.copy(), target_path)
            new_size = target_path.stat().st_size
            replaced.append(f"{variant['name']} → {new_size // 1024}KB")
        except Exception as e:
            errors.append(f"{variant['name']}: {e}")
            shutil.copy2(backup_path, target_path)
    msg = f"✓ {len(replaced)} вариантов · backup: {backup_root.relative_to(ROOT)}"
    if errors:
        msg += f"  ⚠ {'; '.join(errors)}"
    return len(replaced) > 0, msg


HTML_PAGE = """<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>Photo Replace v2</title>
<style>
  body{font-family:-apple-system,sans-serif;margin:0;background:#f5f5f7;color:#111}
  header{background:#0d1a2b;color:#fff;padding:1rem 1.5rem;position:sticky;top:0;z-index:10}
  header h1{margin:0;font-size:1.1rem}
  header small{opacity:.6}
  .controls{display:flex;gap:.8rem;padding:.8rem 1.5rem;background:#fff;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;align-items:center}
  .controls input,.controls select{padding:.4rem .6rem;border:1px solid #d1d5db;border-radius:6px;font-size:13px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem;padding:1.5rem}
  .card{background:#fff;border-radius:10px;padding:.7rem;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .card.dragover{box-shadow:0 0 0 3px #ec7c00;background:#fff7ed}
  .card.uploading{opacity:.5}
  .card.success{box-shadow:0 0 0 3px #16a34a}
  .card.error{box-shadow:0 0 0 3px #dc2626}
  .img-wrap{aspect-ratio:1;background:#f3f4f6;border-radius:6px;overflow:hidden;display:flex;align-items:center;justify-content:center;margin-bottom:.5rem}
  .img-wrap img{width:100%;height:100%;object-fit:cover}
  .meta{font-size:11px;color:#6b7280;line-height:1.5}
  .name{font-size:13px;font-weight:700;color:#111;word-break:break-all;margin-bottom:.2rem}
  .folder{display:inline-block;background:#eef2ff;color:#4f46e5;font-size:10px;padding:2px 6px;border-radius:3px;margin-bottom:.3rem}
  .vbadge{display:inline-block;background:#f3f4f6;color:#374151;font-size:10px;padding:1px 5px;border-radius:3px;margin-right:3px}
  .status{font-size:11px;margin-top:.4rem;padding:.3rem;border-radius:4px;display:none}
  .status.show{display:block}
  .status.ok{background:#d1fae5;color:#065f46}
  .status.err{background:#fee2e2;color:#991b1b}
  .info{padding:.5rem 1.5rem;background:#fffbeb;color:#92400e;font-size:13px;border-bottom:1px solid #fde68a}
</style></head><body>
<header><h1>Photo Replace v2 · только живые фото</h1><small id="counter">загрузка…</small></header>
<div class="info">Перетащи фото на карточку — заменятся <strong>все варианты</strong> (avif+webp+srcset 768/1080/1440), оригиналы → <code>public/images/.backup/&lt;ts&gt;/</code>. Сканируется <code>src/**</code>. UI-папки (icons/team/mentors/cards/reviews/articles/thumbs/jpg) скрыты.</div>
<div class="controls">
  <input type="text" id="search" placeholder="Поиск..." style="flex:1;min-width:180px">
  <select id="sortBy">
    <option value="size-asc">Маленькие сверху (кандидаты)</option>
    <option value="size-desc">Большие сверху</option>
    <option value="name">По имени</option>
    <option value="folder">По папке</option>
  </select>
  <select id="filterFolder"><option value="">Все папки</option></select>
</div>
<div class="grid" id="grid"></div>
<script>
let allGroups=[];
async function loadGroups(){const r=await fetch('/api/groups');allGroups=await r.json();populateFolders();render()}
function populateFolders(){const folders=[...new Set(allGroups.map(g=>g.folder))].sort();const sel=document.getElementById('filterFolder');sel.innerHTML='<option value="">Все папки</option>';folders.forEach(f=>{const o=document.createElement('option');o.value=f;o.textContent=f;sel.appendChild(o)})}
function render(){const search=document.getElementById('search').value.toLowerCase();const sortBy=document.getElementById('sortBy').value;const folder=document.getElementById('filterFolder').value;
  let groups=allGroups.filter(g=>{if(search&&!g.name.toLowerCase().includes(search)&&!g.folder.toLowerCase().includes(search))return false;if(folder&&g.folder!==folder)return false;return true});
  if(sortBy==='size-asc')groups.sort((a,b)=>a.total_size_kb-b.total_size_kb);
  else if(sortBy==='size-desc')groups.sort((a,b)=>b.total_size_kb-a.total_size_kb);
  else if(sortBy==='name')groups.sort((a,b)=>a.name.localeCompare(b.name));
  else if(sortBy==='folder')groups.sort((a,b)=>a.folder.localeCompare(b.folder)||a.name.localeCompare(b.name));
  document.getElementById('counter').textContent=`${groups.length} групп`;
  const grid=document.getElementById('grid');grid.innerHTML='';groups.forEach(g=>grid.appendChild(card(g)))}
function card(g){const c=document.createElement('div');c.className='card';
  const variantBadges=g.variants.map(v=>`<span class="vbadge">${v.ext}${v.width?' '+v.width+'w':''} · ${v.size_kb}KB</span>`).join('');
  c.innerHTML=`<div class="img-wrap"><img src="${g.preview}" loading="lazy"></div><span class="folder">${g.folder}</span><div class="name">${g.name}</div><div class="meta"><span>${g.variant_count} вар. · ${g.total_size_kb} KB всего · ${g.preview_w}×${g.preview_h}</span><div style="margin-top:.3rem">${variantBadges}</div></div><div class="status"></div>`;
  c.dataset.key=g.key;
  c.addEventListener('dragover',e=>{e.preventDefault();c.classList.add('dragover')});
  c.addEventListener('dragleave',()=>c.classList.remove('dragover'));
  c.addEventListener('drop',async e=>{e.preventDefault();c.classList.remove('dragover');const file=e.dataTransfer.files[0];if(!file)return;await uploadReplace(c,file)});
  return c}
async function uploadReplace(card,file){const status=card.querySelector('.status');card.classList.add('uploading');card.classList.remove('success','error');status.className='status show';status.textContent='Обработка...';
  const fd=new FormData();fd.append('file',file);fd.append('key',card.dataset.key);
  try{const r=await fetch('/api/replace',{method:'POST',body:fd});const data=await r.json();card.classList.remove('uploading');
    if(data.ok){card.classList.add('success');status.className='status show ok';status.textContent=data.message;const img=card.querySelector('img');img.src=img.src.split('?')[0]+'?v='+Date.now();setTimeout(()=>loadGroups(),1500)}
    else{card.classList.add('error');status.className='status show err';status.textContent=data.message}
  }catch(err){card.classList.remove('uploading');card.classList.add('error');status.className='status show err';status.textContent=err.message}}
['search','sortBy','filterFolder'].forEach(id=>{document.getElementById(id).addEventListener('input',render);document.getElementById(id).addEventListener('change',render)});
loadGroups();
</script></body></html>"""


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, fmt, *args):
        try:
            arg0 = str(args[0]) if args else ""
        except Exception:
            arg0 = ""
        if "/api/" in arg0:
            super().log_message(fmt, *args)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            body = HTML_PAGE.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if u.path == "/api/groups":
            data = json.dumps(list_grouped()).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        if u.path.startswith("/images/"):
            self.path = "/public" + u.path
            return super().do_GET()
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/replace":
            self.send_error(404); return
        ctype = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in ctype:
            self._json(400, {"ok": False, "message": "expected multipart"}); return
        boundary = ctype.split("boundary=")[1].encode()
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)
        parts = body.split(b"--" + boundary)
        key = None
        file_bytes = None
        for part in parts:
            if b"name=\"key\"" in part:
                key = part.split(b"\r\n\r\n")[1].rsplit(b"\r\n", 1)[0].decode("utf-8")
            elif b"name=\"file\"" in part:
                _, _, content = part.partition(b"\r\n\r\n")
                file_bytes = content.rsplit(b"\r\n", 1)[0]
        if not key or not file_bytes:
            self._json(400, {"ok": False, "message": "missing key or file"}); return
        ok, msg = replace_group(key, file_bytes)
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
    used = collect_used_images()
    existing = [p for p in used if (PUBLIC_DIR / p).is_file()]
    filtered = [p for p in existing if not is_ui_path(p)]
    print(f"  упоминаний в src: {len(used)}, существуют: {len(existing)}, после фильтра UI: {len(filtered)}")
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()
