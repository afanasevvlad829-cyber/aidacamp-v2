export interface TelegramMessageLike {
  photo?: unknown;
  video?: unknown;
  document?: { mimeType?: string; size?: number };
}

export type MediaClassification =
  | { accept: true; fileType: 'photo' | 'video'; mime: string }
  | { accept: false; reason: string; instructionText: string };

const MAX_BYTES = 300 * 1024 * 1024;

const PHOTO_INSTRUCTION =
  'Это сжатое фото. Пришлите оригинал: 📎 → Файл (в галерее отключите сжатие/иконку HD перед отправкой).';
const VIDEO_INSTRUCTION =
  'Это сжатое видео. Пришлите оригинал: 📎 → Файл (в галерее отключите сжатие перед отправкой).';

export function classifyIncomingMedia(msg: TelegramMessageLike): MediaClassification {
  if (msg.photo) {
    return { accept: false, reason: 'compressed_photo', instructionText: PHOTO_INSTRUCTION };
  }
  if (msg.video) {
    return { accept: false, reason: 'compressed_video', instructionText: VIDEO_INSTRUCTION };
  }
  if (!msg.document) {
    return {
      accept: false,
      reason: 'no_attachment',
      instructionText: 'Пришлите фото или видео файлом (📎 → Файл).',
    };
  }
  const mime = msg.document.mimeType ?? '';
  const size = msg.document.size ?? 0;
  if (size > MAX_BYTES) {
    return {
      accept: false,
      reason: 'Файл больше 300 МБ — камп принимает файлы до 200 МБ. Сожмите или разбейте на части.',
      instructionText: 'Файл больше 300 МБ — камп принимает файлы до 200 МБ. Сожмите или разбейте на части.',
    };
  }
  if (mime.startsWith('image/')) {
    return { accept: true, fileType: 'photo', mime };
  }
  if (mime.startsWith('video/')) {
    return { accept: true, fileType: 'video', mime };
  }
  return {
    accept: false,
    reason: 'поддерживаются только фото и видео',
    instructionText: 'Поддерживаются только фото и видео.',
  };
}
