import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { getStaff } from './portalStaff';
import { getActiveShift } from './portalShift';
import { getOrCreateCollectingDraft, appendDraftText, setDraftStatus, setReviewerMessage, type DraftPost } from './draftPost';
import { classifyIncomingMedia, type TelegramMessageLike } from './telegramMedia';
import { attachMedia, listMedia, type MediaItem } from './portalMedia';
import { query } from './db';
import { getTelegramClient } from './telegramClient';
import { Button } from 'telegram/tl/custom/button';

const ALLOWED_ROLES = new Set(['vozhaty', 'teacher', 'rukovoditel', 'admin']);
const NOT_REGISTERED = 'Вы не зарегистрированы в портале, обратитесь к администратору.';
const UPLOADS_ROOT = process.env.PORTAL_UPLOADS_ROOT || '/var/www/aidacamp-dev/uploads/portal';
const URL_PREFIX = '/portal/uploads';

export interface IncomingTextResult { reply: string }

async function authorize(telegramId: number): Promise<{ ok: true } | { ok: false; reply: string }> {
  const staff = await getStaff(telegramId);
  if (!staff || !staff.active || !ALLOWED_ROLES.has(staff.role ?? '')) {
    return { ok: false, reply: NOT_REGISTERED };
  }
  return { ok: true };
}

export async function handleIncomingText(telegramId: number, text: string): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);
  await appendDraftText(draft.id, text);
  return { reply: 'Текст добавлено в черновик. Пришлите ещё фото/видео или /готово.' };
}

export async function handleIncomingMedia(
  telegramId: number,
  msg: TelegramMessageLike & { rawMessage?: unknown; fileName?: string },
): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const classified = classifyIncomingMedia(msg);
  if (!classified.accept) {
    return { reply: classified.instructionText };
  }

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);

  const client = await getTelegramClient();
  const buffer = (await client.downloadMedia(msg.rawMessage as any)) as Buffer;

  const uuid = randomUUID();
  const ext = extname(msg.fileName ?? '').replace(/^\./, '') || (classified.fileType === 'photo' ? 'jpg' : 'mp4');
  const relDir = `media/draft_post/${draft.id}`;
  const absDir = join(UPLOADS_ROOT, relDir);
  await mkdir(absDir, { recursive: true });
  const fileName = `${uuid}.${ext}`;
  const relPath = `${relDir}/${fileName}`;
  await writeFile(join(UPLOADS_ROOT, relPath), buffer);
  const fileUrl = `${URL_PREFIX}/${relPath}`;

  await attachMedia({
    entity_type: 'draft_post',
    entity_id: draft.id,
    file_url: fileUrl,
    file_path: relPath,
    file_type: classified.fileType,
    mime: classified.mime,
    size_bytes: buffer.byteLength,
    author_telegram_id: telegramId,
    storage_kind: 'local',
  });

  return { reply: `Принято (${classified.fileType}).` };
}

const TYPE_LABEL: Record<string, string> = { photo: 'Фото', video: 'Видео' };

export function buildReviewPreviewText(draft: DraftPost, media: MediaItem[]): string {
  const lines = media.map((m, i) => `${i + 1}) ${TYPE_LABEL[m.file_type] ?? m.file_type}`);
  return [
    `Черновик от сотрудника:`,
    '',
    draft.text ?? '',
    '',
    '📎 Состав:',
    ...lines,
  ].join('\n');
}

async function getDirector(): Promise<{ telegram_id: number; full_name: string | null } | null> {
  const rows = await query<{ telegram_id: number; full_name: string | null }>(
    "SELECT telegram_id, full_name FROM portal_staff WHERE staff_key='director' AND active=TRUE LIMIT 1",
  );
  return rows?.[0] ?? null;
}

export async function handleReadyCommand(telegramId: number): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const shift = await getActiveShift();
  const draft = await getOrCreateCollectingDraft(telegramId, shift?.id ?? null);

  const director = await getDirector();
  if (!director) {
    return { reply: 'Не найден активный руководитель смены — сообщите администратору.' };
  }

  const media = await listMedia('draft_post', draft.id);
  const previewText = buildReviewPreviewText(draft, media);

  const client = await getTelegramClient();
  const sent = await client.sendMessage(director.telegram_id, {
    message: previewText,
    buttons: [
      [Button.inline('✅ Одобрить и опубликовать', Buffer.from(`approve:${draft.id}`)), Button.inline('✏️ Изменить текст', Buffer.from(`edit_text:${draft.id}`))],
      [Button.inline('🗑 Убрать элемент', Buffer.from(`remove:${draft.id}`)), Button.inline('🔀 Порядок', Buffer.from(`reorder:${draft.id}`))],
      [Button.inline('❌ Отклонить', Buffer.from(`reject:${draft.id}`))],
    ],
  });

  await setDraftStatus(draft.id, 'pending_review');
  await setReviewerMessage(draft.id, director.telegram_id, (sent as any).id);

  return { reply: 'Черновик отправлен руководителю на одобрение.' };
}
