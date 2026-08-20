#!/usr/bin/env python3
"""Shift Content Bot — приём контента смены АйДаКемп (MVP).

Фото/видео: исходник-файлом — идеал; сжатое из телеграм-камеры тоже принимаем
(хватает для канала), помечаем compressed. Голосовые — ловим и транскрибируем
(Whisper API). Задания дня с напоминаниями за 15 минут, патч-ноуты в 22:05,
сводка админу в 22:30. Telethon (MTProto) — файлы до 2 ГБ.
"""
import asyncio, datetime, json, os, re, subprocess, sys
from zoneinfo import ZoneInfo

import psycopg2
from telethon import TelegramClient, events, Button
from telethon.tl.types import DocumentAttributeFilename

def load_env(path):
    out = {}
    try:
        for line in open(path):
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                out[k] = v
    except FileNotFoundError:
        pass
    return out

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = load_env(os.path.join(HERE, ".env"))
TOOLS_ENV = load_env("/opt/aidacamp-tools/.env")

API_ID = int(ENV["TG_API_ID"])
API_HASH = ENV["TG_API_HASH"]
BOT_TOKEN = ENV["BOT_TOKEN"]
ADMIN_ID = int(ENV.get("ADMIN_ID", "0"))
ADMINS = {ADMIN_ID} | {int(x) for x in ENV.get("ADMIN_IDS", "").replace(" ", "").split(",") if x}
AI_PROXY_URL = "http://127.0.0.1:8118"
DB_DSN = ENV.get("DB_DSN", "dbname=aidacamp user=postgres")
STORAGE = ENV.get("STORAGE", "/var/lib/shift-content/shift5")
SHIFT_START = datetime.date.fromisoformat(ENV.get("SHIFT_START", "2026-08-03"))
SHIFT_DAYS = int(ENV.get("SHIFT_DAYS", "13"))   # длина смены; было зашито 11 (смена 5)
SHIFT_NO = ENV.get("SHIFT_NO", "3")             # номер смены — для патч-ноутов
OPENAI_KEY = ENV.get("OPENAI_API_KEY") or TOOLS_ENV.get("OPENAI_API_KEY", "")
MSK = ZoneInfo("Europe/Moscow")

# MTProto к Telegram из РФ рубится на уровне сети: весь DC2 (149.154.167.0/24)
# недоступен по всем портам, IPv6 на сервере нет. Ходим через локальный xray
# (SOCKS5), у которого в маршрутизации geoip:telegram уходит на proxy-eu.
# Снять блокировку — убрать SOCKS_PROXY из .env, код менять не нужно.
PROXY = None
if ENV.get("SOCKS_PROXY"):
    _ph, _pp = ENV["SOCKS_PROXY"].rsplit(":", 1)
    PROXY = {"proxy_type": "socks5", "addr": _ph, "port": int(_pp), "rdns": True}


#: Прямой путь до OpenAI с сервера закрылся 11.08.2026 («No route to host»),
#: и расшифровка голосовых молча возвращала пустоту. Ходим через локальный xray:
#: в его маршрутизации openai.com уже уходит на европейский узел.
AI_PROXY = "http://127.0.0.1:8118"

NORM_PHOTO = 15
NORM_VIDEO = 3

_conn = None
def db():
    global _conn
    if _conn is None or _conn.closed:
        _conn = psycopg2.connect(DB_DSN)
        _conn.autocommit = True
    return _conn

def q(sql, args=()):
    with db().cursor() as cur:
        cur.execute(sql, args)
        if cur.description:
            return cur.fetchall()
        return None

def now_msk():
    return datetime.datetime.now(MSK)

def shift_day():
    d = (now_msk().date() - SHIFT_START).days + 1
    if d < 1: return 0
    if d > SHIFT_DAYS: return -1
    return d

pending = {}   # user_id -> {"stage": "kids"|"task"|"feedback", "content_id": int}

client = TelegramClient(os.path.join(HERE, "bot"), API_ID, API_HASH, proxy=PROXY)

ROLES = [("вожатый", "vozh"), ("преподаватель", "prep"), ("оператор (Саша)", "oper")]

@client.on(events.NewMessage(pattern="/start"))
async def start(ev):
    rows = q("SELECT role FROM shift_staff WHERE tg_id=%s", (ev.sender_id,))
    if rows:
        await ev.respond("Ты уже в команде. Присылай контент: фото/видео лучше файлом (исходник), голосовые — расшифрую.")
        return
    await ev.respond("Привет! Я собираю контент смены. Кто ты в команде?",
                     buttons=[[Button.inline(t, b"role:" + c.encode()) for t, c in ROLES]])

@client.on(events.CallbackQuery(pattern=b"role:"))
async def set_role(ev):
    role = ev.data.decode().split(":", 1)[1]
    sender = await ev.get_sender()
    name = " ".join(filter(None, [sender.first_name, sender.last_name])) or str(ev.sender_id)
    q("INSERT INTO shift_staff(tg_id, name, role) VALUES(%s,%s,%s) ON CONFLICT (tg_id) DO UPDATE SET role=EXCLUDED.role",
      (ev.sender_id, name, role))
    await ev.edit(f"Записал: {name}, роль — {dict((c, t) for t, c in ROLES)[role]}.\n\n"
                  "Как сдавать контент:\n"
                  "🏆 Идеал — снял родной камерой, отправил из галереи ФАЙЛОМ (Android: скрепка → Файл; iPhone: выбрать фото → ⋯ → «Отправить как файл»). Исходник — для монтажа и архива.\n"
                  "⚡ Быстро — можно снять и отправить прямо в Telegram: приму и так (для канала хватает), но пометка «сжатое» останется.\n"
                  "❗ Ключевые съёмки (арка, защиты, сюжеты дня, кадр для мамы) — только файлом.\n"
                  "🎙 Голосовые заметки — говори свободно, я расшифрую текстом.\n"
                  "🎬 Видео — спрошу, о чём оно (без подписи его не найти в архиве), и сам расшифрую речь с дорожки.\n"
                  "🧒 После загрузки скажу пару вопросов: кто в кадре и по заданию ли это.")

KIND_RU = {"photo": "фото", "video": "видео", "voice": "голосовое"}

def staff_name(uid):
    r = q("SELECT name, role FROM shift_staff WHERE tg_id=%s", (uid,))
    if not r:
        return str(uid), ""
    return r[0][0], dict((c, t) for t, c in ROLES).get(r[0][1], r[0][1] or "")

VIDEO_PREVIEW_LIMIT = 45 * 1024 * 1024   # выше этого шлём кадр, а не сам файл


async def video_poster(path):
    """Кадр из середины ролика — чтобы владелец видел содержимое, а не имя файла."""
    dst = os.path.join("/tmp", f"poster_{os.path.basename(path)}.jpg")
    try:
        probe = await asyncio.create_subprocess_exec(
            "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path,
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        out, _ = await probe.communicate()
        seek = str(int(float(out.decode().strip() or 4) / 2))
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-loglevel", "error", "-ss", seek, "-i", path,
            "-frames:v", "1", "-vf", "scale=720:-2", dst,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await proc.wait()
    except Exception as e:
        print("video_poster failed:", e, file=sys.stderr)
        return None
    return dst if os.path.exists(dst) else None


async def notify_admin_media(cid, kind, path, text):
    """Руководителю уходит сам кадр, а не строчка «принято фото».

    Смотреть ленту загрузок текстом бессмысленно: непонятно, что снято и годится
    ли оно. Под каждым кадром — кнопка, чтобы тут же переспросить автора.
    """
    if not ADMIN_ID:
        return
    btns = [[Button.inline("❓ Спросить автора", f"askauth:{cid}".encode())]]
    try:
        size = os.path.getsize(path)
        if kind == "video" and size > VIDEO_PREVIEW_LIMIT:
            poster = await video_poster(path)
            note = f"{text}\n(видео {size/1e6:.0f} МБ — показываю кадр)"
            await client.send_file(ADMIN_ID, poster or path, caption=note, buttons=btns)
        else:
            await client.send_file(ADMIN_ID, path, caption=text, buttons=btns)
    except Exception as e:
        print("notify_admin_media failed:", e, file=sys.stderr)
        await notify_admin(text)


async def notify_admin(text):
    """Руководителю уходит лента загрузок: кто и что сдал, в реальном времени.
    Показываем всё, включая загрузки самого админа — иначе ленту не проверить."""
    if not ADMIN_ID:
        return
    try:
        await client.send_message(ADMIN_ID, text)
    except Exception as e:
        print("notify_admin failed:", e, file=sys.stderr)

def is_staff(uid):
    return bool(q("SELECT 1 FROM shift_staff WHERE tg_id=%s", (uid,)))

HEIC_EXT = (".heic", ".heif")
ASK_KIDS = "Кто в кадре? Имена через запятую (или «общий»)."
ASK_CAPTION = "🎬 А теперь описание: что на видео происходит? Ответь одной строкой — по нему видео и найдут в архиве."

async def heic_to_jpg(src):
    """iPhone шлёт файлом HEIC: его не покажет ни браузер, ни превью портала
    (sharp собран без libheif). Кладём рядом JPG и в базу пишем уже его —
    оригинал остаётся на диске как исходник для монтажа."""
    dst = os.path.splitext(src)[0] + ".jpg"
    try:
        proc = await asyncio.create_subprocess_exec(
            "heif-convert", "-q", "90", src, dst,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await proc.wait()
    except Exception as e:
        print("heic_to_jpg failed:", e, file=sys.stderr)
        return None
    return dst if os.path.exists(dst) and os.path.getsize(dst) > 0 else None

async def save_content(ev, kind, compressed):
    d = shift_day()
    folder = os.path.join(STORAGE, f"Day_{d:02d}" if d > 0 else "pre", kind)
    os.makedirs(folder, exist_ok=True)
    fname = f"{now_msk().strftime('%H%M%S')}_{ev.sender_id}_{ev.message.id}"
    msg = await ev.respond("Скачиваю…")
    try:
        path = await client.download_media(ev.message, file=os.path.join(folder, fname))
    except Exception as e:
        # Та же тихая потеря, что была у голосовых (см. incoming_voice) —
        # только тут фото/видео. Найдено и исправлено 19.08.2026.
        print(f"save_content: скачивание упало для {ev.sender_id} ({kind}): {e}", flush=True)
        return await msg.edit("Не получилось скачать файл — попробуйте отправить ещё раз.")
    if kind == "photo" and path.lower().endswith(HEIC_EXT):
        jpg = await heic_to_jpg(path)
        if jpg:
            path = jpg
    size_mb = os.path.getsize(path) / 1e6
    caption = (ev.message.message or "").strip()
    rows = q("INSERT INTO shift_content(day, kind, path, author_tg, caption, compressed, created_at) "
             "VALUES(%s,%s,%s,%s,%s,%s,now()) RETURNING id",
             (d, kind, path, ev.sender_id, caption, compressed))
    cid = rows[0][0]
    note = " · сжатое (для канала ок; для архива лучше файлом)" if compressed else " · исходник 👍"
    head = f"Принял ({size_mb:.1f} МБ){note}"

    # Видео без описания бесполезно на монтаже — спрашиваем всегда, даже если
    # подпись приложили в Telegram: та обычно в одно слово. Пока описания нет,
    # к «кто в кадре» не переходим. Дорожку расшифровываем параллельно, в фоне.
    if kind == "video":
        asyncio.create_task(transcribe_video(cid, path, ev.sender_id))
        pending[ev.sender_id] = {"stage": "caption", "content_id": cid}
        was = f"\nПодпись из Telegram: «{caption}»" if caption else ""
        await msg.edit(f"{head}{was}\n{ASK_CAPTION}")
    else:
        pending[ev.sender_id] = {"stage": "kids", "content_id": cid}
        await msg.edit(f"{head}\n{ASK_KIDS}")

    # Ответ на заявку под конкретный пост: привязываем кадр к ней сразу.
    try:
        reply_to = ev.message.reply_to_msg_id
    except Exception:
        reply_to = None
    if reply_to:
        req = q("SELECT id, post_title FROM photo_request "
                "WHERE tg_id=%s AND sent_msg_id=%s AND status='sent'",
                (ev.sender_id, reply_to))
        if req:
            rid, title = req[0]
            q("UPDATE photo_request SET status='done', content_id=%s, answered_at=now() WHERE id=%s",
              (cid, rid))
            await ev.respond(f"Принял под пост «{title}» 👍 Кадр прикреплён к нему.")
            await notify_admin(f"Фотограф закрыл заявку: «{title}»")

    if True:
        who, role_ru = staff_name(ev.sender_id)
        where = f"день {d}" if d > 0 else "до смены"
        src = "сжатое" if compressed else "исходник"
        await notify_admin_media(cid, kind, path,
            f"📥 {who}"
            + (f" ({role_ru})" if role_ru else "")
            + f" — {KIND_RU.get(kind, kind)}, {src}\n{where} · {size_mb:.1f} МБ"
            + (f"\nПодпись: «{caption}»" if caption else "")
        )

@client.on(events.NewMessage(func=lambda e: e.photo is not None and not e.document))
async def compressed_photo(ev):
    if not is_staff(ev.sender_id): return
    await save_content(ev, "photo", compressed=True)

@client.on(events.NewMessage(func=lambda e: e.document is not None and e.voice is None))
async def incoming_file(ev):
    if not is_staff(ev.sender_id): return
    mime = ev.document.mime_type or ""
    kind = "photo" if mime.startswith("image/") else "video" if mime.startswith("video/") else None
    if kind is None:
        return
    compressed = False
    if kind == "video":
        has_fname = any(isinstance(a, DocumentAttributeFilename) for a in ev.document.attributes)
        compressed = not has_fname
    await save_content(ev, kind, compressed)

async def transcribe(path):
    """Whisper API через curl (паттерн transcribe-training.sh)."""
    if not OPENAI_KEY:
        return None
    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "--proxy", AI_PROXY,
        "-X", "POST", "https://api.openai.com/v1/audio/transcriptions",
        "-H", f"Authorization: Bearer {OPENAI_KEY}",
        "-F", f"file=@{path}", "-F", "model=whisper-1", "-F", "language=ru",
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await proc.communicate()
    try:
        return json.loads(out).get("text", "").strip() or None
    except Exception:
        return None

WHISPER_MAX_BYTES = 24 * 1024 * 1024   # лимит файла у Whisper API — 25 МБ, берём с запасом

# На тишине Whisper не молчит, а «дорисовывает» титры из обучающей выборки:
# «Субтитры делал DimaTorzok», «Продолжение следует…». Это не речь с площадки —
# такое в карточку видео не пускаем, иначе монтажёр ищет по выдуманному тексту.
JUNK_TRANSCRIPT = re.compile(
    r'субтитр|dimatorzok|продолжение следует|редактор субтитров|amara\.org|'
    r'корректор[аы]?\s|подписывайтесь|спасибо за (про)?смотр|до новых встреч|'
    r'thanks for watching', re.I)

def is_junk_transcript(text):
    return len(text.strip(' .,!?…-—')) < 12 or bool(JUNK_TRANSCRIPT.search(text))

async def transcribe_video(cid, path, uid):
    """Дорожку видео расшифровываем в фоне (asyncio.create_task): ffmpeg на
    гигабайтном файле идёт минуты, держать на этом хендлер нельзя — у Telegram
    свой тайм-аут, у снимающего терпение. Немое видео ffmpeg отдаст ошибкой —
    это норма, молча выходим. mp3 32 kbps моно: ~100 минут влезает в лимит."""
    tmp = f"/tmp/shift-video-{cid}.mp3"
    try:
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-y", "-i", path, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "32k", tmp,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL)
        await proc.wait()
        if proc.returncode != 0 or not os.path.exists(tmp) or os.path.getsize(tmp) == 0:
            return
        if os.path.getsize(tmp) > WHISPER_MAX_BYTES:
            print(f"transcribe_video {cid}: дорожка {os.path.getsize(tmp)/1e6:.0f} МБ — больше лимита Whisper",
                  file=sys.stderr)
            return
        text = await transcribe(tmp)
        if not text:
            return
        if is_junk_transcript(text):
            print(f"transcribe_video {cid}: отброшено как шум — {text[:60]!r}", file=sys.stderr)
            return
        q("UPDATE shift_content SET transcript=%s WHERE id=%s", (text, cid))
        show = text if len(text) < 700 else text[:700] + "…"
        await client.send_message(uid, f"🎬 Расшифровка видео:\n«{show}»")
    except Exception as e:
        print(f"transcribe_video {cid} failed:", e, file=sys.stderr)
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass

@client.on(events.NewMessage(func=lambda e: e.voice is not None))
async def incoming_voice(ev):
    if not is_staff(ev.sender_id): return
    d = shift_day()
    folder = os.path.join(STORAGE, f"Day_{d:02d}" if d > 0 else "pre", "voice")
    os.makedirs(folder, exist_ok=True)
    fname = f"{now_msk().strftime('%H%M%S')}_{ev.sender_id}_{ev.message.id}.ogg"
    try:
        path = await client.download_media(ev.message, file=os.path.join(folder, fname))
    except Exception as e:
        # Без этого сбой скачивания (таймаут GetFileRequest и т.п.) тихо теряет
        # голосовое: в базу ничего не попадает, а отправитель видит галочку
        # "доставлено" и думает, что всё сохранилось. Найдено 19.08.2026.
        print(f"incoming_voice: скачивание упало для {ev.sender_id}: {e}", flush=True)
        return await ev.respond("Не получилось скачать голосовое — попробуйте отправить ещё раз.")
    rows = q("INSERT INTO shift_content(day, kind, path, author_tg, bucket, created_at) "
             "VALUES(%s,'voice',%s,%s,'stash',now()) RETURNING id", (d, path, ev.sender_id))
    cid = rows[0][0]
    msg = await ev.respond("Голосовое принял, расшифровываю…")
    text = await transcribe(path)
    if text:
        q("UPDATE shift_content SET transcript=%s WHERE id=%s", (text, cid))
        show = text if len(text) < 900 else text[:900] + "…"
        await msg.edit(f"🎙 Расшифровка:\n«{show}»\n\nСохранил в копилку дня.")
    else:
        await msg.edit("Голосовое сохранил, но расшифровать не вышло — гляну позже.")

#: Короче этого текст на отчёт не тянет — «ок», «спасибо», «спокойной ночи».
MIN_REPORT_LEN = 25


async def free_text_report(ev):
    """Текст, присланный просто так, — это отчёт за день, а не мусор.

    Раньше такое сообщение молча выбрасывалось: обработчик срабатывал, только
    если бот сам чего-то ждал. Человек писал отчёт, бот не отвечал ничего, и
    отчёт исчезал. 09.08.2026 выяснилось, что так «не сдавали» сразу двое, хотя
    сдавали — их текст просто не попадал никуда. Теперь пишем в ту же таблицу,
    что и ночные патч-ноуты, и обязательно отвечаем, чтобы человек видел: принято.
    """
    if not is_staff(ev.sender_id):
        return
    # Владелец числится в shift_staff для доступа к инструментам, но его сообщения
    # боту — это администрирование, не полевой отчёт. 17.08.2026 его разбор
    # инцидента с галереей попал в shift_feedback и ушёл в материал для
    # night-drafts.py как будто это отчёт вожатого.
    if ev.sender_id == ADMIN_ID:
        return
    text = (ev.text or "").strip()
    if len(text) < MIN_REPORT_LEN:
        return await ev.respond(
            "Это слишком коротко для отчёта, поэтому не сохранил.\n"
            "Пришлите текст подробнее или голосовое — приму и то, и другое.")
    q("INSERT INTO shift_feedback(day, tg_id, text, created_at) VALUES(%s,%s,%s,now())",
      (shift_day(), ev.sender_id, text))
    await ev.respond(f"Отчёт принял, записал за день {shift_day()} 👍\n"
                     f"{len(text)} символов. Голосовым тоже можно — расшифрую.")


# --- АйдаШтаб: правка поста плана дня реплаем админа ---
# Зарегистрирован ДО общего текстового хендлера: реплай на пост плана дня
# перехватывается здесь (StopPropagation), остальной текст идёт в обычный флоу.

def _hq_find_slot_by_msg(mid):
    rows = q("""SELECT d.id, s.key FROM decision_log d,
                jsonb_each(d.execution->'daria'->'slots') s
                WHERE d.kind='shift_day' AND d.created_at > now() - interval '3 days'
                  AND s.value @> to_jsonb(%s::int)""", (mid,))
    return rows[0] if rows else None


@client.on(events.NewMessage(func=lambda e: e.is_reply and e.text and not e.text.startswith("/")))
async def hq_edit_reply(ev):
    if ev.sender_id not in ADMINS:
        return
    found = _hq_find_slot_by_msg(ev.reply_to_msg_id)
    if not found:
        return
    did, slot = found
    _hq_set_slot(did, slot, {"edit_request": {"text": ev.text, "at": now_msk().isoformat()}})
    q("UPDATE decision_log SET feedback = COALESCE(feedback,'') || %s WHERE id=%s",
      (f"\n[{slot}] правка: {ev.text}", did))
    await ev.reply("🔧 Принято — переделаю и пришлю новый вариант (пару минут)")
    raise events.StopPropagation


@client.on(events.NewMessage(func=lambda e: e.text and not e.text.startswith("/") and e.document is None and e.photo is None and e.voice is None))
async def text_router(ev):
    st = pending.get(ev.sender_id)
    if st and st.get("stage") in ("task_dialog", "task_confirm"):
        return await task_dialog(ev, (ev.text or "").strip())
    if st and st["stage"] == "ask_author":
        pending.pop(ev.sender_id, None)
        text = (ev.text or "").strip()
        if text.lower() in ("отмена", "отменить", "нет"):
            return await ev.respond("Отменил.")
        row = q("SELECT c.author_tg, c.path, c.kind, s.name FROM shift_content c "
                "LEFT JOIN shift_staff s ON s.tg_id=c.author_tg WHERE c.id=%s",
                (st["content_id"],))
        if not row:
            return await ev.respond("Кадр не найден.")
        author_tg, path, kind, who = row[0]
        try:
            send_path = path
            if kind == "video" and os.path.getsize(path) > VIDEO_PREVIEW_LIMIT:
                send_path = await video_poster(path) or path
            await client.send_file(author_tg, send_path,
                                   caption=f"Вопрос по этому кадру:\n\n{text}")
            await ev.respond(f"Отправил {who or author_tg}.")
        except Exception as e:
            await ev.respond(f"Не ушло: {e}")
        return
    if not st:
        return await free_text_report(ev)
    if st["stage"] == "caption":
        q("UPDATE shift_content SET caption=%s WHERE id=%s", (ev.text.strip(), st["content_id"]))
        st["stage"] = "kids"
        await ev.respond(f"Записал 👍\n{ASK_KIDS}")
    elif st["stage"] == "kids":
        q("UPDATE shift_content SET kids=%s WHERE id=%s", (ev.text.strip(), st["content_id"]))
        st["stage"] = "task"
        d = shift_day()
        tasks = q("SELECT id, title FROM shift_tasks WHERE day=%s AND NOT done ORDER BY deadline", (d,))
        btns = [[Button.inline(t[:55], f"task:{st['content_id']}:{tid}".encode())] for tid, t in tasks[:6]]
        btns.append([Button.inline("🗃 Просто так — в копилку", f"task:{st['content_id']}:0".encode())])
        await ev.respond("Это по контентному заданию или просто так?", buttons=btns)
    elif st["stage"] == "feedback":
        q("INSERT INTO shift_feedback(day, tg_id, text, created_at) VALUES(%s,%s,%s,now())",
          (shift_day(), ev.sender_id, ev.text.strip()))
        pending.pop(ev.sender_id, None)
        await ev.respond("Отчёт принял 🙌 Спокойной ночи!")

@client.on(events.CallbackQuery(pattern=b"task:"))
async def bind_task(ev):
    _, cid, tid = ev.data.decode().split(":")
    cid, tid = int(cid), int(tid)
    if tid == 0:
        q("UPDATE shift_content SET task_id=NULL, bucket='stash' WHERE id=%s", (cid,))
        await ev.edit("В копилку ✅ Спасибо!")
    else:
        q("UPDATE shift_content SET task_id=%s, bucket='task' WHERE id=%s", (tid, cid))
        q("UPDATE shift_tasks SET done=true WHERE id=%s", (tid,))
        t = q("SELECT title FROM shift_tasks WHERE id=%s", (tid,))[0][0]
        await ev.edit(f"Привязал к заданию «{t}» ✅")
        if True:
            who, _ = staff_name(ev.sender_id)
            kids = q("SELECT kids FROM shift_content WHERE id=%s", (cid,))
            kids_s = (kids[0][0] or "").strip() if kids else ""
            await notify_admin(
                f"✅ Задание закрыто: «{t}»\n{who}"
                + (f" · в кадре: {kids_s}" if kids_s else "")
            )
    pending.pop(ev.sender_id, None)

ROLE_WORDS = {"vozh": ["вожат"], "prep": ["препод", "учител"], "oper": ["фотограф", "оператор", "саш"]}


async def ask_model(prompt, system="Ты помощник руководителя детского лагеря."):
    """Модель через локальный xray: прямой путь до OpenAI с сервера закрыт."""
    body = json.dumps({"model": "gpt-4o-mini", "max_tokens": 500, "temperature": 0.2,
                       "response_format": {"type": "json_object"},
                       "messages": [{"role": "system", "content": system},
                                    {"role": "user", "content": prompt}]})
    proc = await asyncio.create_subprocess_exec(
        "curl", "-s", "--proxy", AI_PROXY_URL, "-X", "POST",
        "https://api.openai.com/v1/chat/completions",
        "-H", f"Authorization: Bearer {OPENAI_KEY}", "-H", "content-type: application/json",
        "-d", body, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await proc.communicate()
    try:
        return json.loads(json.loads(out)["choices"][0]["message"]["content"])
    except Exception as e:
        print("ask_model failed:", e, file=sys.stderr)
        return None


async def task_dialog(ev, said):
    """Пока задача не исполнима — доспрашиваем.

    Задача без срока и без исполнителя не выполняется никогда: за смену мы это
    видели двенадцать раз подряд. Поэтому бот не принимает формулировку, пока в
    ней нет кому, что и к какому часу.
    """
    st = pending.get(ev.sender_id, {})
    history = st.get("history", []) + [said]
    prompt = (
        "Руководитель ставит задачу персоналу лагеря. Реплики по порядку:\n"
        + "\n".join(f"- {h}" for h in history) +
        "\n\nЗадача исполнима, если ясно ТРИ вещи: кому (вожатым, преподавателям "
        "или фотографу), что именно сделать (конкретное действие, а не тема) и к "
        "какому времени сегодня.\n"
        "Верни JSON: {\"ready\": true/false, \"role\": \"vozh|prep|oper|all\", "
        "\"title\": \"формулировка задачи одной строкой\", \"deadline\": \"ЧЧ:ММ\", "
        "\"question\": \"один короткий вопрос, если чего-то не хватает\"}\n"
        "Спрашивай только про недостающее и по одному вопросу за раз.")
    res = await ask_model(prompt)
    if not res:
        pending.pop(ev.sender_id, None)
        return await ev.respond("Не смог разобрать задачу — сформулируй одним сообщением: кому, что и к какому часу.")

    if not res.get("ready"):
        pending[ev.sender_id] = {"stage": "task_dialog", "history": history}
        return await ev.respond(res.get("question") or "Уточни, пожалуйста: кому, что именно и к какому часу?")

    pending[ev.sender_id] = {"stage": "task_confirm", "history": history, "task": res}
    role_ru = {"vozh": "вожатым", "prep": "преподавателям", "oper": "фотографу", "all": "всем"}
    await ev.respond(
        f"Задача собралась:\n\n«{res['title']}»\nКому: {role_ru.get(res.get('role'), res.get('role'))}\n"
        f"Срок: сегодня до {res.get('deadline')}\n\nСтавим?",
        buttons=[[Button.inline("Поставить", b"task_ok"), Button.inline("Отмена", b"task_no")]])


@client.on(events.CallbackQuery(pattern=b"task_ok"))
async def task_ok(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer()
    st = pending.pop(ev.sender_id, None)
    if not st or st.get("stage") != "task_confirm":
        return await ev.answer("Задача уже обработана", alert=True)
    t = st["task"]
    d = shift_day()
    q("INSERT INTO shift_tasks (day, title, resp_role, deadline) VALUES(%s,%s,%s,%s)",
      (d, t["title"], t.get("role", "all"), t.get("deadline", "21:00")))
    role = t.get("role", "all")
    rows = q("SELECT tg_id FROM shift_staff WHERE %s='all' OR role=%s", (role, role))
    who, _ = staff_name(ev.sender_id)
    sent = 0
    for (tg_id,) in rows:
        try:
            await client.send_message(tg_id,
                f"НОВАЯ ЗАДАЧА от {who}\n\n{t['title']}\n\nСрок: сегодня до {t.get('deadline')}")
            sent += 1
        except Exception:
            pass
    await ev.edit(f"Поставил и разослал ({sent} чел.):\n«{t['title']}» до {t.get('deadline')}")


@client.on(events.CallbackQuery(pattern=b"task_no"))
async def task_no(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer()
    pending.pop(ev.sender_id, None)
    await ev.edit("Отменил.")


@client.on(events.NewMessage(pattern="/task"))
async def task_cmd(ev):
    if ev.sender_id not in ADMINS:
        return
    said = (ev.text or "").replace("/task", "", 1).strip()
    if not said:
        pending[ev.sender_id] = {"stage": "task_dialog", "history": []}
        return await ev.respond("Что нужно сделать? Напишите своими словами — "
                                "если чего-то не хватит, переспрошу.")
    await task_dialog(ev, said)


@client.on(events.NewMessage(pattern="/status"))
async def status_cmd(ev):
    if ev.sender_id not in ADMINS:
        return
    d = shift_day()
    rows = q("SELECT title, resp_role, deadline, done FROM shift_tasks WHERE day=%s ORDER BY deadline", (d,))
    if not rows:
        return await ev.respond(f"На день {d} задач нет.")
    role_ru = {"vozh": "вожатые", "prep": "преподаватели", "oper": "фотограф", "all": "все"}
    done = [r for r in rows if r[3]]
    lines = [f"Задачи дня {d}: сдано {len(done)} из {len(rows)}", ""]
    for title, role, dl, ok in rows:
        lines.append(f"{'✅' if ok else '⬜'} {str(dl)[:5]} · {role_ru.get(role, role)} · {title}")
    fb = q("SELECT count(DISTINCT tg_id) FROM shift_feedback WHERE day=%s", (d,))[0][0]
    vo = q("SELECT count(DISTINCT author_tg) FROM shift_content WHERE day=%s AND kind='voice'", (d,))[0][0]
    lines += ["", f"Отчёты сдали: голосом {vo}, текстом {fb}"]
    await ev.respond("\n".join(lines))


@client.on(events.NewMessage(pattern="/svodka"))
async def svodka_cmd(ev):
    if ev.sender_id not in ADMINS: return
    await ev.respond(build_svodka())

def build_svodka():
    d = shift_day()
    ph = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='photo'", (d,))[0][0]
    ph_c = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='photo' AND compressed", (d,))[0][0]
    vd = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='video'", (d,))[0][0]
    vd_c = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='video' AND compressed", (d,))[0][0]
    vc = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='voice'", (d,))[0][0]
    stash = q("SELECT count(*) FROM shift_content WHERE day=%s AND bucket='stash'", (d,))[0][0]
    open_tasks = q("SELECT title FROM shift_tasks WHERE day=%s AND NOT done", (d,))
    fb = q("SELECT count(DISTINCT tg_id) FROM shift_feedback WHERE day=%s", (d,))[0][0]
    staff_n = q("SELECT count(*) FROM shift_staff", ())[0][0]
    disk = os.statvfs(STORAGE if os.path.exists(STORAGE) else "/")
    free_gb = disk.f_bavail * disk.f_frsize / 1e9
    lines = [f"📊 Сводка дня {d}",
             f"Фото: {ph}/{NORM_PHOTO}+ (сжатых {ph_c}) · Видео: {vd}/{NORM_VIDEO} (сжатых {vd_c}) · Голосовых: {vc}",
             f"Копилка: {stash} · Отчёты: {fb}/{staff_n}",
             f"Диск: свободно {free_gb:.1f} ГБ"]
    no_cap = q("SELECT count(*) FROM shift_content WHERE day=%s AND kind='video' "
               "AND COALESCE(caption,'')=''", (d,))[0][0]
    if no_cap:
        lines.append(f"📝 Видео без подписи: {no_cap} — не найдутся в архиве")
    if open_tasks:
        lines.append("⚠️ Не закрыты задания:\n" + "\n".join("• " + t[0] for t in open_tasks))
    else:
        lines.append("✅ Все задания дня закрыты")
    return "\n".join(lines)

async def scheduler():
    reminded = set()
    fb_asked_day = None
    nudge_day = None
    svodka_sent_day = None
    while True:
        try:
            n = now_msk()
            d = shift_day()
            if d > 0:
                for tid, title, deadline, role in q(
                        "SELECT id, title, deadline, resp_role FROM shift_tasks WHERE day=%s AND NOT done", (d,)):
                    dl = datetime.datetime.combine(n.date(), deadline, MSK)
                    delta = (dl - n).total_seconds()
                    if 0 < delta <= 15 * 60 and tid not in reminded:
                        reminded.add(tid)
                        for (tg_id,) in q("SELECT tg_id FROM shift_staff WHERE role=%s OR %s='all'", (role, role)):
                            try:
                                await client.send_message(tg_id, f"⏰ Через 15 минут дедлайн: «{title}». Успеваем?")
                            except Exception:
                                pass
                if n.hour == 15 and nudge_day != d:
                    nudge_day = d
                    for (tg_id,) in q("SELECT tg_id FROM shift_staff", ()):
                        try:
                            await client.send_message(
                                tg_id, "\u2600\ufe0f \u041f\u043e\u043b\u0434\u043d\u044f \u043f\u0440\u043e\u0448\u043b\u043e. "
                                       "\u0415\u0441\u043b\u0438 \u0441 \u0443\u0442\u0440\u0430 \u0447\u0442\u043e-\u0442\u043e \u0441\u043b\u0443\u0447\u0438\u043b\u043e\u0441\u044c \u2014 \u0441\u043c\u0435\u0448\u043d\u043e\u0435, "
                                       "\u043d\u0435\u043e\u0436\u0438\u0434\u0430\u043d\u043d\u043e\u0435, \u0447\u0435\u0439-\u0442\u043e \u043f\u0435\u0440\u0432\u044b\u0439 \u0440\u0430\u0437, \u0441\u043f\u043e\u0440, "
                                       "\u0444\u0440\u0430\u0437\u0430, \u043a\u043e\u0442\u043e\u0440\u0443\u044e \u0445\u043e\u0447\u0435\u0442\u0441\u044f \u0437\u0430\u043f\u0438\u0441\u0430\u0442\u044c, \u2014 "
                                       "\u043d\u0430\u0433\u043e\u0432\u043e\u0440\u0438\u0442\u0435 \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u044b\u043c \u0438\u043b\u0438 \u043f\u0440\u0438\u0448\u043b\u0438\u0442\u0435 \u043a\u0430\u0434\u0440. "
                                       "\u0422\u0440\u0438 \u043c\u0438\u043d\u0443\u0442\u044b. \u0418\u0437 \u044d\u0442\u043e\u0433\u043e \u043f\u043e\u0442\u043e\u043c \u0432\u044b\u0445\u043e\u0434\u044f\u0442 \u043f\u043e\u0441\u0442\u044b.\n\n"
                                       "\u041d\u0435\u0447\u0435\u0433\u043e \u2014 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u043e\u0442\u0432\u0435\u0447\u0430\u0439\u0442\u0435, \u044d\u0442\u043e \u043d\u043e\u0440\u043c\u0430\u043b\u044c\u043d\u043e.")
                        except Exception:
                            pass
                if n.hour == 21 and fb_asked_day != d:
                    fb_asked_day = d
                    for (tg_id,) in q("SELECT tg_id FROM shift_staff", ()):
                        pending[tg_id] = {"stage": "feedback"}
                        try:
                            await client.send_message(
                                tg_id, f"🌙 Отчёт за день {d}. Три части, каждая — пара предложений.\n\n"
                                       "1. Одна сцена, которую вы видели своими глазами. "
                                       "Кто, что делал, что сказал — по возможности дословно. Одна, не пять.\n\n"
                                       "2. Что изменилось у конкретного ребёнка по сравнению со вчера. "
                                       "Не «молодец», а что именно стало иначе.\n\n"
                                       "3. Что не получилось — у вас, у ребят, у техники.\n\n"
                                       "Расписание дня писать не нужно: что было по плану, мы знаем и без вас. "
                                       "Можно голосовым — расшифрую.")
                        except Exception:
                            pass
                if n.hour == 22 and n.minute >= 30 and svodka_sent_day != d and ADMIN_ID:
                    svodka_sent_day = d
                    await client.send_message(ADMIN_ID, build_svodka())
        except Exception as e:
            print("scheduler error:", e, file=sys.stderr)
        await asyncio.sleep(60)

@client.on(events.CallbackQuery(pattern=b"askauth:"))
async def ask_author_start(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer()
    cid = int(ev.data.decode().split(":", 1)[1])
    pending[ADMIN_ID] = {"stage": "ask_author", "content_id": cid}
    await ev.answer("Напишите вопрос следующим сообщением")
    await ev.respond("Напишите вопрос — передам автору вместе с этим кадром. "
                     "Чтобы отменить, отправьте «отмена».")


@client.on(events.CallbackQuery(pattern=b"askq:"))
async def approve_question(ev):
    """Владелец согласовал вопрос, который предложил агент разбора ответов.

    Вопросы сотрудникам не уходят автоматически: модель иногда придумывает их
    на пустом месте (10.08 предлагала спросить про пересъёмку, о которой человек
    не говорил). Поэтому между агентом и сотрудником стоит одна кнопка.
    """
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    lid = int(ev.data.decode().split(":", 1)[1])
    row = q("SELECT author_tg, question, status FROM reply_agent_log WHERE id=%s", (lid,))
    if not row:
        return await ev.answer("Запись не найдена", alert=True)
    author_tg, question, status = row[0]
    if status != "proposed":
        return await ev.answer(f"Уже обработано: {status}", alert=True)
    try:
        await client.send_message(author_tg, question)
    except Exception as e:
        return await ev.answer(f"Не ушло: {e}", alert=True)
    q("UPDATE reply_agent_log SET status='sent' WHERE id=%s", (lid,))
    await ev.edit(f"✅ Отправлено сотруднику:\n«{question}»")


@client.on(events.CallbackQuery(pattern=b"skipq:"))
async def skip_question(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    lid = int(ev.data.decode().split(":", 1)[1])
    row = q("SELECT question FROM reply_agent_log WHERE id=%s", (lid,))
    q("UPDATE reply_agent_log SET status='skipped' WHERE id=%s", (lid,))
    await ev.edit(f"✖️ Не отправлено:\n«{row[0][0] if row else ''}»")

@client.on(events.CallbackQuery(pattern=b"askstory:"))
async def approve_story_question(ev):
    """Владелец согласовал наводящий вопрос от story-агента (контур постов).

    Тот же принцип, что и у askq: — агент предлагает, человек нажимает,
    только после этого уходит сотруднику. Автоматической отправки нет.
    """
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    lid = int(ev.data.decode().split(":", 1)[1])
    row = q("SELECT author_tg, question, hypothesis, status FROM story_agent_log WHERE id=%s", (lid,))
    if not row:
        return await ev.answer("Запись не найдена", alert=True)
    author_tg, question, hypothesis, status = row[0]
    if status != "proposed":
        return await ev.answer(f"Уже обработано: {status}", alert=True)
    text = question if not hypothesis else f"{question}\n\nПредполагаю, что {hypothesis}. Так?"
    try:
        await client.send_message(author_tg, text)
    except Exception as e:
        return await ev.answer(f"Не ушло: {e}", alert=True)
    q("UPDATE story_agent_log SET status='sent' WHERE id=%s", (lid,))
    await ev.edit(f"✅ Отправлено:\n«{text}»")


@client.on(events.CallbackQuery(pattern=b"skipstory:"))
async def skip_story_question(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    lid = int(ev.data.decode().split(":", 1)[1])
    row = q("SELECT question FROM story_agent_log WHERE id=%s", (lid,))
    q("UPDATE story_agent_log SET status='skipped' WHERE id=%s", (lid,))
    await ev.edit(f"✖️ Не отправлено:\n«{row[0][0] if row else ''}»")



# --- АйдаШтаб: одобрение постов плана дня админами (hqpub/hqskip) ---
# agent-hq шлёт готовые посты с кнопками; нажатие пишет решение в
# decision_log.execution.posts.<slot>, публикует executor agent-hq (5-мин таймер).

def _hq_set_slot(did, slot, patch):
    q("""UPDATE decision_log SET execution = jsonb_set(
           CASE WHEN COALESCE(execution,'{}'::jsonb) ? 'posts' THEN execution
                ELSE COALESCE(execution,'{}'::jsonb) || '{"posts":{}}'::jsonb END,
           ARRAY['posts', %s],
           COALESCE(execution #> ARRAY['posts', %s], '{}'::jsonb) || %s::jsonb,
           true)
         WHERE id=%s AND kind='shift_day'""", (slot, slot, json.dumps(patch), did))


# --- АйдаШтаб: отчёты по задачам владельца (kind=staff_task) ---
# Задача ставится сообщением в этот бот; отчёт — reply на него, текстом или
# голосом. Голосовое транскрибируем тут же (Whisper), чтобы в Штабе был текст,
# а не «ответила голосовым». Зарегистрирован ДО общих хендлеров текста/голоса.

def _hq_task_by_msg(mid):
    rows = q("""SELECT id, title FROM decision_log
                WHERE kind='staff_task' AND status IN ('proposed','edited')
                  AND execution->'daria'->'message_ids' @> to_jsonb(%s::int)""", (mid,))
    return rows[0] if rows else None


@client.on(events.NewMessage(func=lambda e: e.is_reply and (e.text or e.voice)))
async def hq_task_report(ev):
    if ev.sender_id not in ADMINS:
        return
    task = _hq_task_by_msg(ev.reply_to_msg_id)
    if not task:
        return
    did, title = task
    text = (ev.text or "").strip()
    if ev.voice:
        path = await ev.download_media(file="/tmp/")
        try:
            text = (await transcribe(path)) or ""
        except Exception as e:
            text = f"(голосовое, расшифровка не удалась: {e})"
    q("""UPDATE decision_log SET status='executed', executed_at=now(),
           feedback = COALESCE(feedback,'') || %s,
           execution = COALESCE(execution,'{}'::jsonb) || jsonb_build_object('report', %s::text, 'reported_at', now())
         WHERE id=%s""", (f"\n[отчёт Дарьи] {text}", text, did))
    await ev.reply("✅ Отчёт принят, задача закрыта. Спасибо!")
    raise events.StopPropagation


@client.on(events.CallbackQuery(pattern=b"hqpub:"))
async def hq_publish_post(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    _, did, slot = ev.data.decode().split(":", 2)
    _hq_set_slot(int(did), slot, {"daria_approved": True, "approved_by": ev.sender_id})
    await ev.answer("Принято: выйдет в свой слот (или сразу, если время прошло)")
    try:
        await ev.edit(buttons=None)
    except Exception:
        pass


@client.on(events.CallbackQuery(pattern=b"hqskip:"))
async def hq_skip_post(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    _, did, slot = ev.data.decode().split(":", 2)
    _hq_set_slot(int(did), slot, {"skipped": True, "skipped_by": ev.sender_id})
    await ev.answer("Пропущен — публиковаться не будет")
    try:
        await ev.edit(buttons=None)
    except Exception:
        pass


# --- АйдаШтаб: одобрение постов канала (hqcpub/hqcskip) ---
# Посты канала (kind=post) приходят Дарье сюда же с кнопками: одобрение —
# обычный переход decision_log в approved, дальше работает конвейер agent-hq.

@client.on(events.CallbackQuery(pattern=b"hqcpub:"))
async def hq_channel_publish(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    did = int(ev.data.decode().split(":", 1)[1])
    q("UPDATE decision_log SET status='approved', answered_at=now() WHERE id=%s AND kind='post' AND status IN ('proposed','edited')", (did,))
    await ev.answer("Принято — пост одобрен")
    try:
        await ev.edit(buttons=None)
    except Exception:
        pass


@client.on(events.CallbackQuery(pattern=b"hqcskip:"))
async def hq_channel_skip(ev):
    if ev.sender_id not in ADMINS:
        return await ev.answer("Не для тебя", alert=True)
    did = int(ev.data.decode().split(":", 1)[1])
    q("UPDATE decision_log SET status='declined', answered_at=now() WHERE id=%s AND kind='post' AND status IN ('proposed','edited')", (did,))
    await ev.answer("Пропущен")
    try:
        await ev.edit(buttons=None)
    except Exception:
        pass


# --- АйдаШтаб: сквозной приём всего, что пишут в бот ---
# Принцип владельца (20.08.2026): любое сообщение в бот должно дойти до
# агента, даже если сценарий не был предусмотрен. Хендлер стоит ПОСЛЕДНИМ и
# ничего не перехватывает (нет StopPropagation) — только зеркалит в hq_inbox.
# Решение «нужна ли реакция» принимает триаж-агент (inbox-triage.mjs), а не бот.

@client.on(events.NewMessage(incoming=True))
async def hq_inbox_mirror(ev):
    try:
        if not ev.is_private:
            return
        kind = "text"
        if ev.voice: kind = "voice"
        elif ev.photo: kind = "photo"
        elif ev.document: kind = "document"
        elif not ev.text: kind = "other"
        sender = await ev.get_sender()
        name = " ".join(x for x in [getattr(sender, "first_name", None), getattr(sender, "last_name", None)] if x) or None
        role_rows = q("SELECT role FROM shift_staff WHERE tg_id=%s", (ev.sender_id,))
        role = role_rows[0][0] if role_rows else ("owner" if ev.sender_id in ADMINS else "unknown")
        text = ev.text or None
        # Голосовые расшифровываем СРАЗУ: триаж-агент работает с текстом, а без
        # расшифровки голосовой отчёт тихо теряется (инцидент 20.08.2026).
        if ev.voice:
            try:
                vp = await ev.download_media(file="/tmp/")
                text = (await transcribe(vp)) or None
            except Exception as e:
                print(f"[hq_inbox] голосовое не расшифровано: {e}")
        q("""INSERT INTO hq_inbox (bot, chat_id, user_id, user_name, user_role, message_id, reply_to, kind, text)
             VALUES ('shift', %s, %s, %s, %s, %s, %s, %s, %s)
             ON CONFLICT (bot, chat_id, message_id) DO UPDATE SET text=COALESCE(EXCLUDED.text, hq_inbox.text)""",
          (ev.chat_id, ev.sender_id, name, role, ev.id, ev.reply_to_msg_id, kind, text))
    except Exception as e:
        print(f"[hq_inbox] не записалось: {e}")


async def main():
    await client.start(bot_token=BOT_TOKEN)
    print("Shift Content Bot started")
    asyncio.create_task(scheduler())
    await client.run_until_disconnected()

if __name__ == "__main__":
    asyncio.run(main())
