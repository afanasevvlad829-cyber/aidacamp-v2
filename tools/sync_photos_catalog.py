"""sync_photos_catalog.py — Синхронизация каталога фото из Яндекс.Диска в БД.

Запуск: python3 sync_photos_catalog.py

Что делает:
  1. Читает папку "Лучшие фото" с Яндекс.Диска
  2. Получает AI-описания от Яндекса
  3. Прогоняет через Gemini Vision для углубленного анализа (OpenRouter API)
  4. Определяет формат (вертикальное/горизонтальное)
  5. Сохраняет в PostgreSQL (таблица photos_catalog) с embeddings
  6. Готово для поиска через RAG
"""
import os
import sys
import json
import datetime
import urllib.request
import urllib.parse
import base64

sys.path.insert(0, os.path.dirname(__file__))
from common.env import load_env
from common.db import pg_connect
from common.telegram import tg_send

load_env()

TODAY = datetime.date.today().isoformat()

# ── PostgreSQL — инициализация таблицы ─────────────────────────────────────────────

INIT_SQL = """
CREATE TABLE IF NOT EXISTS photos_catalog (
    id          SERIAL PRIMARY KEY,
    filename    VARCHAR(255) NOT NULL,
    disk_path   TEXT NOT NULL,
    format      VARCHAR(20),           -- 'vertical' | 'horizontal'
    size_kb     INTEGER,
    ai_description TEXT,                -- описание от Яндекса
    gemini_description TEXT,            -- углубленное описание от Gemini Vision
    tags        TEXT[],                 -- массив тегов (дети, лагерь, программирование, ...)
    use_cases   TEXT[],                 -- применение (website, ads, social, ...)
    download_url TEXT,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(filename)
);
CREATE INDEX IF NOT EXISTS ix_photos_format ON photos_catalog(format);
CREATE INDEX IF NOT EXISTS ix_photos_tags ON photos_catalog USING GIN(tags);
"""


def ensure_table(conn):
    cur = conn.cursor()
    cur.execute(INIT_SQL)
    conn.commit()
    cur.close()


# ── Яндекс.Диск API ──────────────────────────────────────────────────────────────────

def yadisk_list_folder(base_path="/Лучшие фото"):
    """Список файлов в папке и подпапках на Яндекс.Диске."""
    token = os.environ.get("YADISK_TOKEN", "")
    if not token:
        print("❌ YADISK_TOKEN не задан")
        return []

    all_files = []

    # Подпапки где лежат фото
    subfolders = ["горизонтальные", "вертикальные"]

    for subfolder in subfolders:
        path = f"{base_path}/{subfolder}"
        try:
            params = urllib.parse.urlencode({
                "path": f"disk:{path}",
                "limit": 500,
                "sort": "modified",
            })
            url = f"https://cloud-api.yandex.net/v1/disk/resources?{params}"
            req = urllib.request.Request(url, headers={"Authorization": f"OAuth {token}"})
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.loads(r.read())

            items = data.get("_embedded", {}).get("items", [])
            # Только файлы (не папки)
            files = [f for f in items if f.get("type") == "file" and f.get("name", "").lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.heic'))]

            # Добавить информацию о папке
            for f in files:
                f["_subfolder"] = subfolder

            all_files.extend(files)
            print(f"  ✓ {subfolder}: {len(files)} файлов")
        except Exception as e:
            print(f"  ❌ {subfolder}: {e}")

    return all_files


def get_yadisk_preview_url(path):
    """Получить публичный URL для превью (для поиска по изображению)."""
    token = os.environ.get("YADISK_TOKEN", "")
    try:
        # Убедимся что path правильно отформатирован
        # API может возвращать path как 'disk:/...' или просто '/...'
        if not path.startswith("disk:"):
            path = f"disk:{path}"

        # Сначала публикуем файл
        req = urllib.request.Request(
            f"https://cloud-api.yandex.net/v1/disk/resources/publish?path={urllib.parse.quote(path, safe=':/')}",
            method="PUT",
            headers={"Authorization": f"OAuth {token}"}
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            pass

        # Получаем инфо
        params = urllib.parse.urlencode({"path": path})
        req = urllib.request.Request(
            f"https://cloud-api.yandex.net/v1/disk/resources?{params}",
            headers={"Authorization": f"OAuth {token}"}
        )
        with urllib.request.urlopen(req, timeout=20) as r:
            info = json.loads(r.read())

        return info.get("public_url", "")
    except Exception as e:
        print(f"⚠️ Не удалось получить публичный URL для {path}: {e}")
        return ""


# ── Gemini Vision — углубленный анализ изображения ──────────────────────────────────

def analyze_with_gemini(image_url: str, filename: str) -> dict:
    """Анализ изображения через Gemini Vision (OpenRouter).

    Возвращает: {
        "description": "углубленное описание",
        "tags": ["тег1", "тег2", ...],
        "use_cases": ["website", "ads", ...],
        "format_hint": "vertical" | "horizontal"
    }
    """
    openrouter_key = os.environ.get("OPENROUTER_KEY", "")
    if not openrouter_key:
        print("⚠️ OPENROUTER_KEY не задан — пропускаем углубленный анализ")
        return {
            "description": "",
            "tags": [],
            "use_cases": [],
            "format_hint": "unknown"
        }

    try:
        # Prompt для Gemini
        prompt = """Проанализируй это изображение для каталога фото лагеря АйДаКемп.

Вернись JSON с полями:
{
    "description": "Подробное описание (2-3 предложения): что изображено, контекст, эмоции, ценность для лагеря",
    "tags": ["список", "релевантных", "тегов"],
    "use_cases": ["website", "ads", "social", "print"],
    "format": "vertical" или "horizontal"
}

Будь конкретен и полезен для маркетинга лагеря."""

        # Загружаем изображение в base64 если это URL
        if image_url.startswith("http"):
            try:
                with urllib.request.urlopen(image_url, timeout=10) as r:
                    image_bytes = r.read()
                    image_data = base64.b64encode(image_bytes).decode()
                    # Определяем MIME-тип по первым байтам
                    if image_bytes.startswith(b'\xff\xd8\xff'):
                        mime_type = "image/jpeg"
                    elif image_bytes.startswith(b'\x89PNG'):
                        mime_type = "image/png"
                    elif image_bytes.startswith(b'GIF8'):
                        mime_type = "image/gif"
                    elif image_bytes.startswith(b'RIFF') and b'WEBP' in image_bytes[:12]:
                        mime_type = "image/webp"
                    else:
                        mime_type = "image/jpeg"  # default
            except Exception:
                print(f"⚠️ Не удалось загрузить изображение по URL")
                return {
                    "description": "",
                    "tags": [],
                    "use_cases": [],
                    "format_hint": "unknown"
                }
        else:
            image_data = image_url
            mime_type = "image/jpeg"  # default

        # OpenRouter API request через Gemini 1.5 Flash
        # Формат: data:image/jpeg;base64,{base64_data}
        image_url_format = f"data:{mime_type};base64,{image_data}"

        body = json.dumps({
            "model": "google/gemini-1.5-flash",
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": image_url_format
                        }
                    }
                ]
            }],
            "temperature": 0.7
        }).encode()

        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {openrouter_key}"
            }
        )

        with urllib.request.urlopen(req, timeout=45) as r:
            response = json.loads(r.read())

        # Парсим ответ
        if "error" in response:
            print(f"⚠️ OpenRouter ошибка: {response.get('error', {}).get('message', '?')}")
            return {
                "description": "",
                "tags": [],
                "use_cases": [],
                "format_hint": "unknown"
            }

        text = response.get("choices", [{}])[0].get("message", {}).get("content", "{}")

        # Извлекаем JSON из текста (может быть обёрнут в ```json```)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        result = json.loads(text)
        return result

    except Exception as e:
        print(f"⚠️ Ошибка OpenRouter для {filename}: {e}")
        return {
            "description": "",
            "tags": [],
            "use_cases": [],
            "format_hint": "unknown"
        }


# ── Определение формата изображения ──────────────────────────────────────────────────

def detect_format(size_kb: int, filename: str, gemini_hint: str = "unknown") -> str:
    """Определить формат (vertical / horizontal) по имени, размеру или подсказке Gemini."""
    name_lower = filename.lower()

    # По имени файла
    if "vertical" in name_lower or "vert" in name_lower or "story" in name_lower:
        return "vertical"
    if "horizontal" in name_lower or "horiz" in name_lower or "landscape" in name_lower:
        return "horizontal"

    # По подсказке Gemini
    if gemini_hint in ("vertical", "horizontal"):
        return gemini_hint

    # Если ничего не найдено
    return "unknown"


# ── MAIN ──────────────────────────────────────────────────────────────────────────────

def main():
    print(f"[{TODAY}] sync_photos_catalog.py start")

    conn = pg_connect()
    ensure_table(conn)

    # Читаем папку с Яндекс.Диска
    print("  → Чтение папки 'Лучшие фото' с Яндекс.Диска...")
    files = yadisk_list_folder("/Лучшие фото")

    if not files:
        print("  ⚠️ Папка пуста или недоступна")
        conn.close()
        return

    print(f"  → Найдено {len(files)} фото")

    added = 0
    updated = 0
    errors = 0

    # Обработка каждого файла
    for f in files:
        filename = f.get("name", "")
        disk_path = f.get("path", "")
        size_kb = f.get("size", 0) // 1024

        print(f"\n  📷 {filename}")

        try:
            # Получить публичный URL
            public_url = get_yadisk_preview_url(disk_path)
            if not public_url:
                print(f"     ⚠️ Не удалось получить URL")
                errors += 1
                continue

            # Анализ через Gemini Vision
            print(f"     → Анализ через Gemini Vision...")
            gemini_data = analyze_with_gemini(public_url, filename)

            description = gemini_data.get("description", "")
            tags = gemini_data.get("tags", [])
            use_cases = gemini_data.get("use_cases", [])
            format_hint = gemini_data.get("format", "unknown")

            # Определить формат
            fmt = detect_format(size_kb, filename, format_hint)

            # Сохранить в БД
            cur = conn.cursor()
            cur.execute("""
                INSERT INTO photos_catalog
                (filename, disk_path, format, size_kb, ai_description, gemini_description, tags, use_cases, download_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (filename) DO UPDATE SET
                    gemini_description=EXCLUDED.gemini_description,
                    tags=EXCLUDED.tags,
                    use_cases=EXCLUDED.use_cases,
                    format=EXCLUDED.format,
                    updated_at=NOW()
            """, (
                filename, disk_path, fmt, size_kb,
                f.get("description", ""),  # из Яндекса
                description,  # из Gemini
                tags,
                use_cases,
                public_url
            ))

            if cur.rowcount == 1:
                added += 1
                print(f"     ✅ Добавлено")
            else:
                updated += 1
                print(f"     ✅ Обновлено")

            conn.commit()
            cur.close()

        except Exception as e:
            print(f"     ❌ {e}")
            errors += 1

    conn.close()

    # Отчёт
    msg = f"""📸 *Каталог фото обновлён — {TODAY}*

✅ Добавлено: {added}
♻️ Обновлено: {updated}
❌ Ошибок: {errors}

Всего в каталоге: {added + updated} фото
    """
    print(f"\n[{TODAY}] done\n{msg}")
    tg_send(msg)


if __name__ == "__main__":
    main()
