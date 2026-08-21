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

/**
 * Смена, к которой относится выборка. Номера дней (`day`) каждый заезд
 * начинает заново, поэтому одного дня мало: 20.08.2026 на дне 4 сошлись
 * 86 кадров смены 3–15 августа и 56 сегодняшних.
 *
 * Основной ключ — `shift_id` (FK на `shift`), его проставляет бот при приёме
 * и миграция `scripts/migrations/002-shift-content-shift-id.sql` для всего,
 * что снято раньше. Окно дат осталось фолбэком: им подхватываются строки,
 * у которых `shift_id` пуст (бот не смог сопоставить свой SHIFT_START со
 * строкой в `shift`). Нижняя граница окна сдвинута на месяц назад, чтобы не
 * потерять «день 0» — то, что снято до заезда.
 */
export interface ShiftScope {
  id: number;    // shift.id
  from?: string; // ISO-дата старта смены — только для фолбэка
  to?: string;   // ISO-дата окончания
}

function scopeClause(scope: ShiftScope | null, alias: string, firstIdx: number): { sql: string; params: string[] } {
  if (!scope) return { sql: '', params: [] };
  const params: string[] = [String(scope.id)];
  const exact = `${alias}.shift_id = $${firstIdx}::bigint`;
  if (!scope.from || !scope.to) return { sql: ` AND ${exact}`, params };
  params.push(scope.from, scope.to);
  return {
    sql: ` AND (${exact}
           OR (${alias}.shift_id IS NULL
               AND ${alias}.created_at >= ($${firstIdx + 1}::date - interval '30 days')
               AND ${alias}.created_at < ($${firstIdx + 2}::date + interval '2 days')))`,
    params,
  };
}

/** Дни, по которым уже что-то сдано (для подсветки вкладок). */
export async function contentDays(scope: ShiftScope | null = null): Promise<Map<number, number>> {
  const w = scopeClause(scope, 'c', 1);
  const rows = await query<{ day: number; n: string }>(
    `SELECT day, count(*)::text AS n FROM shift_content c WHERE true${w.sql} GROUP BY day ORDER BY day`,
    w.params,
  );
  return new Map((rows ?? []).map((r) => [Number(r.day), Number(r.n)]));
}

/** Всё сданное за день текущей смены, новое сверху. */
export async function listContent(day: number, scope: ShiftScope | null = null): Promise<ShiftContentItem[]> {
  const w = scopeClause(scope, 'c', 2);
  const rows = await query<ShiftContentItem>(
    `${SELECT_ITEM} WHERE c.day = $1${w.sql} ORDER BY c.created_at DESC, c.id DESC`,
    [String(day), ...w.params],
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
export async function listFeedback(day: number, scope: ShiftScope | null = null): Promise<ShiftFeedbackItem[]> {
  const w = scopeClause(scope, 'f', 2); // те же номера дней у прошлых смен — см. ShiftScope
  const rows = await query<ShiftFeedbackItem>(
    `SELECT f.id, f.day, f.text, f.created_at,
            s.name AS author, s.role AS author_role
       FROM shift_feedback f
       LEFT JOIN shift_staff s ON s.tg_id = f.tg_id
      WHERE f.day = $1${w.sql}
      ORDER BY f.created_at DESC, f.id DESC`,
    [String(day), ...w.params],
  );
  return rows ?? [];
}

/**
 * Задания дня + сколько кадров под каждое уже сдано.
 *
 * Саму `shift_tasks` смена не разделяет: это общий шаблон дней 1–13 на все
 * заезды, своего `shift_id` у него нет и не нужно. А вот привязанные кадры
 * считаем в рамках смены — `task_id` переиспользуется теми же заданиями, и без
 * фильтра задание выглядит закрытым чужой съёмкой и пропадает из списка «не
 * сдано». 21.08.2026 так молча выпадали три задания: «Ролик ребят: обзор
 * комнаты» и «Сюжет дня: „Первый баг“» (день 2) и «Ролик ребят: обзор
 * бассейна» (день 4) — каждое закрывал ровно один кадр прошлого заезда.
 */
export async function listTasks(day: number, scope: ShiftScope | null = null): Promise<ShiftTaskRow[]> {
  const w = scopeClause(scope, 'c', 2);
  const rows = await query<ShiftTaskRow>(
    `SELECT t.id, t.day, t.title, t.resp_role, t.deadline::text AS deadline, t.done,
            (SELECT count(*) FROM shift_content c
              WHERE c.task_id = t.id${w.sql})::int AS shots
       FROM shift_tasks t
      WHERE t.day = $1
      ORDER BY t.deadline, t.id`,
    [String(day), ...w.params],
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
