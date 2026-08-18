// src/lib/portalShiftContent.ts
// Чтение контента, который персонал сдаёт в Telegram-бота смены
// (@Aidacamp2026bot, /opt/shift-content-bot). Портал сюда ТОЛЬКО читает:
// роли aidacamp_app выданы лишь SELECT на shift_content/shift_tasks/shift_staff,
// единственный писатель этих таблиц — сам бот.
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { query } from './db';

const execFileP = promisify(execFile);

/** Куда бот складывает исходники (его STORAGE). */
export const SHIFT_CONTENT_ROOT =
  process.env.SHIFT_CONTENT_STORAGE || '/var/lib/shift-content/shift5';
/** Кэш превью — рядом с хранилищем, чтобы не смешивать с исходниками. */
const THUMB_DIR = path.join(path.dirname(SHIFT_CONTENT_ROOT), 'thumbs');
const THUMB_SIDE = 480;

export interface ShiftContentItem {
  id: number;
  day: number;
  kind: string; // photo | video | voice
  path: string;
  kids: string | null;
  caption: string | null;
  transcript: string | null;
  compressed: boolean;
  bucket: string | null; // new | task | stash
  created_at: string;
  author: string | null;
  author_role: string | null;
  task_id: number | null;
  task_title: string | null;
}

export interface ShiftTaskRow {
  id: number;
  day: number;
  title: string;
  resp_role: string;
  deadline: string;
  done: boolean;
  shots: number; // сколько кадров уже привязано
}

const ROLE_LABEL: Record<string, string> = {
  vozh: 'вожатый',
  prep: 'преподаватель',
  oper: 'оператор',
  all: 'все',
};
export const roleLabel = (r: string | null | undefined): string =>
  (r && ROLE_LABEL[r]) || r || '';

const SELECT_ITEM = `
  SELECT c.id, c.day, c.kind, c.path, c.kids, c.caption, c.transcript,
         COALESCE(c.compressed, false) AS compressed, c.bucket, c.created_at,
         s.name AS author, s.role AS author_role,
         c.task_id, t.title AS task_title
    FROM shift_content c
    LEFT JOIN shift_staff s ON s.tg_id = c.author_tg
    LEFT JOIN shift_tasks t ON t.id = c.task_id`;

/** Дни, по которым уже что-то сдано (для подсветки вкладок). */
export async function contentDays(): Promise<Map<number, number>> {
  const rows = await query<{ day: number; n: string }>(
    'SELECT day, count(*)::text AS n FROM shift_content GROUP BY day ORDER BY day',
  );
  return new Map((rows ?? []).map((r) => [Number(r.day), Number(r.n)]));
}

/** Всё сданное за день, новое сверху. */
export async function listContent(day: number): Promise<ShiftContentItem[]> {
  const rows = await query<ShiftContentItem>(
    `${SELECT_ITEM} WHERE c.day = $1 ORDER BY c.created_at DESC, c.id DESC`,
    [day],
  );
  return rows ?? [];
}

export async function getContentItem(id: number): Promise<ShiftContentItem | null> {
  const rows = await query<ShiftContentItem>(`${SELECT_ITEM} WHERE c.id = $1`, [id]);
  return rows?.[0] ?? null;
}

export interface ShiftFeedbackItem {
  id: number;
  day: number;
  text: string;
  created_at: string;
  author: string | null;
  author_role: string | null;
}

/**
 * Отчёты, написанные текстом. Живут в отдельной таблице, потому что приходят
 * не файлом, а сообщением, — но для читающего это тот же отчёт за день, что и
 * голосовой. Пока их здесь не было, вечер выглядел пустым: 11.08 голосовых не
 * прислал никто, а четыре текстовых отчёта в ленту не попадали.
 */
export async function listFeedback(day: number): Promise<ShiftFeedbackItem[]> {
  const rows = await query<ShiftFeedbackItem>(
    `SELECT f.id, f.day, f.text, f.created_at,
            s.name AS author, s.role AS author_role
       FROM shift_feedback f
       LEFT JOIN shift_staff s ON s.tg_id = f.tg_id
      WHERE f.day = $1
      ORDER BY f.created_at DESC, f.id DESC`,
    [day],
  );
  return rows ?? [];
}

/** Задания дня + сколько кадров под каждое уже сдано. */
export async function listTasks(day: number): Promise<ShiftTaskRow[]> {
  const rows = await query<ShiftTaskRow>(
    `SELECT t.id, t.day, t.title, t.resp_role, t.deadline::text AS deadline, t.done,
            (SELECT count(*) FROM shift_content c WHERE c.task_id = t.id)::int AS shots
       FROM shift_tasks t
      WHERE t.day = $1
      ORDER BY t.deadline, t.id`,
    [day],
  );
  return rows ?? [];
}

/**
 * Путь из БД пишет бот, но наружу мы его не доверяем: отдаём файл, только если
 * он реально лежит внутри хранилища. Защита от «..» и абсолютных подмен.
 */
function safeSourcePath(p: string | null | undefined): string | null {
  if (!p) return null;
  const abs = path.resolve(p);
  const root = path.resolve(SHIFT_CONTENT_ROOT);
  return abs === root || abs.startsWith(root + path.sep) ? abs : null;
}

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
  '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4',
};

/** Оригинал как есть — для скачивания и просмотра в полном размере. */
export async function readOriginal(
  item: ShiftContentItem,
): Promise<{ buf: Buffer; type: string; name: string } | null> {
  const abs = safeSourcePath(item.path);
  if (!abs) return null;
  try {
    const buf = await readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    return { buf, type: MIME[ext] || 'application/octet-stream', name: path.basename(abs) };
  } catch {
    return null;
  }
}

/**
 * Превью 480 px с кэшем на диске: исходники по 2–3 МБ, за смену их сотни —
 * отдавать их в плитку нельзя, страница ляжет. Видео — кадр через ffmpeg.
 * Голосовые превью не имеют (их представляет расшифровка).
 */
export async function readThumb(item: ShiftContentItem): Promise<Buffer | null> {
  if (item.kind === 'voice') return null;
  const abs = safeSourcePath(item.path);
  if (!abs) return null;

  const cached = path.join(THUMB_DIR, `${item.id}.jpg`);
  try {
    return await readFile(cached);
  } catch {
    /* нет в кэше — генерим ниже */
  }

  let buf: Buffer | null = null;
  try {
    const sharp = (await import('sharp')).default;
    if (item.kind === 'video') {
      // кадр на первой секунде; -f image2pipe, чтобы не плодить временные файлы
      const { stdout } = await execFileP(
        'ffmpeg',
        ['-ss', '1', '-i', abs, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', '-'],
        { encoding: 'buffer', maxBuffer: 32 * 1024 * 1024, timeout: 20_000 },
      );
      buf = await sharp(stdout as unknown as Buffer)
        .resize(THUMB_SIDE, THUMB_SIDE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
    } else {
      buf = await sharp(abs)
        .rotate() // уважить EXIF-ориентацию, иначе половина кадров ляжет боком
        .resize(THUMB_SIDE, THUMB_SIDE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 78 })
        .toBuffer();
    }
  } catch {
    return null;
  }

  try {
    await mkdir(THUMB_DIR, { recursive: true });
    await writeFile(cached, buf);
  } catch {
    /* кэш не обязателен — отдадим сгенерированное */
  }
  return buf;
}
