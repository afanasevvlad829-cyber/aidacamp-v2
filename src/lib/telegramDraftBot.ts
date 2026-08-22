import { getStaff } from './portalStaff';
import { getActiveShift } from './portalShift';
import { getOrCreateCollectingDraft, appendDraftText } from './draftPost';
import { classifyIncomingMedia, type TelegramMessageLike } from './telegramMedia';

const ALLOWED_ROLES = new Set(['vozhaty', 'teacher', 'rukovoditel', 'admin']);
const NOT_REGISTERED = 'Вы не зарегистрированы в портале, обратитесь к администратору.';

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

export async function handleIncomingMedia(telegramId: number, msg: TelegramMessageLike): Promise<IncomingTextResult> {
  const auth = await authorize(telegramId);
  if (!auth.ok) return { reply: auth.reply };

  const classified = classifyIncomingMedia(msg);
  if (!classified.accept) {
    return { reply: classified.instructionText };
  }
  // Сохранение файла и attachMedia — Task 8.
  return { reply: `Принято (${classified.fileType}).` };
}
