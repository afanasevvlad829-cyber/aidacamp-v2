import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./portalStaff', () => ({
  getStaff: vi.fn(),
}));
vi.mock('./portalShift', () => ({
  getActiveShift: vi.fn(async () => ({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' })),
  getShiftById: vi.fn(),
}));
vi.mock('./draftPost', () => ({
  getOrCreateCollectingDraft: vi.fn(async () => ({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null })),
  appendDraftText: vi.fn(async () => {}),
  setDraftStatus: vi.fn(async () => {}),
  setReviewerMessage: vi.fn(async () => {}),
  setDraftText: vi.fn(async () => {}),
  getDraft: vi.fn(),
}));
vi.mock('./portalMedia', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    attachMedia: vi.fn(async () => 42),
    listMedia: vi.fn(async () => [{ id: 1, file_type: 'photo' }, { id: 2, file_type: 'video' }]),
    deleteMedia: vi.fn(async () => {}),
    reorderMedia: vi.fn(async () => {}),
  };
});
vi.mock('./db', () => ({
  query: vi.fn(async () => []),
  withDbClient: vi.fn(),
}));
vi.mock('fs/promises', () => ({ mkdir: vi.fn(async () => {}), writeFile: vi.fn(async () => {}) }));
vi.mock('./telegramClient', () => ({
  getTelegramClient: vi.fn(async () => ({
    downloadMedia: vi.fn(async () => Buffer.from('fake-bytes')),
    sendMessage: vi.fn(async () => ({ id: 999 })),
    sendFile: vi.fn(async () => ({ id: 999 })),
  })),
}));

import { getStaff } from './portalStaff';
import { appendDraftText, setDraftStatus, setReviewerMessage } from './draftPost';
import { attachMedia, listMedia } from './portalMedia';
import { query } from './db';

beforeEach(() => vi.clearAllMocks());

describe('handleIncomingText', () => {
  it('отклоняет неизвестного telegram_id', async () => {
    (getStaff as any).mockResolvedValue(null);
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(999, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
    expect(appendDraftText).not.toHaveBeenCalled();
  });

  it('отклоняет роль student', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'student', roles: ['student'], active: true, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
  });

  it('отклоняет неактивного сотрудника', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: false, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'привет');
    expect(r.reply).toContain('не зарегистрированы');
  });

  it('копит текст в черновик активного vozhaty', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
    const { handleIncomingText } = await import('./telegramDraftBot');
    const r = await handleIncomingText(111, 'Сегодня было весело');
    expect(appendDraftText).toHaveBeenCalledWith(5, 'Сегодня было весело');
    expect(r.reply).toContain('добавлено');
  });
});

describe('handleIncomingMedia', () => {
  it('отклоняет сжатое фото с инструкцией', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'teacher', roles: ['teacher'], active: true, full_name: 'Аня', tg_username: null });
    const { handleIncomingMedia } = await import('./telegramDraftBot');
    const r = await handleIncomingMedia(111, { photo: {} });
    expect(r.reply).toContain('Файл');
  });

  it('скачивает и сохраняет document с image/*', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
    const { handleIncomingMedia } = await import('./telegramDraftBot');
    const r = await handleIncomingMedia(111, { document: { mimeType: 'image/jpeg', size: 1000 } } as any);
    expect(attachMedia).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: 'draft_post', entity_id: 5, file_type: 'photo', mime: 'image/jpeg', author_telegram_id: 111 }),
    );
    expect(r.reply).toContain('Принято');
  });
});

describe('buildReviewPreviewText', () => {
  it('нумерует состав по типам', async () => {
    const { buildReviewPreviewText } = await import('./telegramDraftBot');
    const text = buildReviewPreviewText(
      { id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Привет', reviewer_chat_id: null, reviewer_message_id: null } as any,
      [{ file_type: 'photo' }, { file_type: 'photo' }, { file_type: 'video' }] as any,
    );
    expect(text).toContain('1) Фото');
    expect(text).toContain('2) Фото');
    expect(text).toContain('3) Видео');
    expect(text).toContain('Привет');
  });
});

describe('handleReadyCommand', () => {
  it('без активного руководителя — сообщает об ошибке, не падает', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
    (query as any).mockResolvedValue([]);
    const { handleReadyCommand } = await import('./telegramDraftBot');
    const r = await handleReadyCommand(111);
    expect(r.reply).toContain('руководител');
    expect(setDraftStatus).not.toHaveBeenCalled();
  });

  it('находит руководителя и переводит черновик в pending_review', async () => {
    (getStaff as any).mockResolvedValue({ telegram_id: 111, role: 'vozhaty', roles: ['vozhaty'], active: true, full_name: 'Вася', tg_username: null });
    (query as any).mockResolvedValue([{ telegram_id: 777, full_name: 'Иван' }]);
    (listMedia as any).mockResolvedValue([{ file_type: 'photo' }]);
    const { handleReadyCommand } = await import('./telegramDraftBot');
    const r = await handleReadyCommand(111);
    expect(r.reply).toContain('отправлен');
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'pending_review');
    expect(setReviewerMessage).toHaveBeenCalledWith(5, 777, 999);
  });
});

describe('parseCallbackData', () => {
  it('парсит approve:5', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('approve:5')).toEqual({ action: 'approve', draftId: 5 });
  });
  it('парсит edit_text:12', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('edit_text:12')).toEqual({ action: 'edit_text', draftId: 12 });
  });
  it('возвращает null для мусора', async () => {
    const { parseCallbackData } = await import('./telegramDraftBot');
    expect(parseCallbackData('что-то не то')).toBeNull();
  });
});

describe('applyTextEdit / applyRemoveMedia / applyReorder', () => {
  it('applyTextEdit пишет новый текст', async () => {
    const { setDraftText } = await import('./draftPost');
    const { applyTextEdit } = await import('./telegramDraftBot');
    await applyTextEdit(5, 'Новый текст');
    expect(setDraftText).toHaveBeenCalledWith(5, 'Новый текст');
  });

  it('applyRemoveMedia вызывает deleteMedia', async () => {
    const { deleteMedia } = await import('./portalMedia');
    const { applyRemoveMedia } = await import('./telegramDraftBot');
    await applyRemoveMedia(2);
    expect(deleteMedia).toHaveBeenCalledWith(2);
  });

  it('applyReorder вызывает reorderMedia с порядком', async () => {
    const { reorderMedia } = await import('./portalMedia');
    const { applyReorder } = await import('./telegramDraftBot');
    await applyReorder(5, [3, 1, 2]);
    expect(reorderMedia).toHaveBeenCalledWith([3, 1, 2]);
  });
});

describe('applyReject', () => {
  it('переводит черновик в rejected и уведомляет автора', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'X', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getTelegramClient } = await import('./telegramClient');
    const { applyReject } = await import('./telegramDraftBot');
    await applyReject(5);
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'rejected');
    const mockClient = await (getTelegramClient as any).mock.results[0].value;
    expect(mockClient.sendMessage).toHaveBeenCalledWith(111, expect.objectContaining({ message: expect.any(String) }));
  });
});

describe('applyApprove', () => {
  it('без tg_parent_channel_id у смены — возвращает ошибку, не публикует, не меняет статус', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: false, error: expect.stringContaining('канал') });
    expect(setDraftStatus).not.toHaveBeenCalledWith(5, 'approved', expect.anything());
  });

  it('публикует и переводит в approved', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active', tg_parent_channel_id: -100123 });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: true });
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'approved', 777);
  });

  it('sendFile падает — возвращает ok:false и не переводит черновик в approved', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active', tg_parent_channel_id: -100123 });
    const { getTelegramClient } = await import('./telegramClient');
    (getTelegramClient as any).mockResolvedValueOnce({
      sendFile: vi.fn(async () => { throw new Error('Telegram недоступен'); }),
      sendMessage: vi.fn(async () => ({ id: 999 })),
    });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: false, error: expect.stringContaining('Ошибка публикации') });
    expect(setDraftStatus).not.toHaveBeenCalledWith(5, 'approved', expect.anything());
  });

  it('Finding 1: передаёт в GramJS абсолютный путь (join UPLOADS_ROOT + file_path), а не сырой относительный', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, tg_parent_channel_id: -100123 });
    const { listMedia } = await import('./portalMedia');
    (listMedia as any).mockResolvedValue([
      { id: 1, file_type: 'photo', file_path: 'media/draft_post/5/uuid.jpg', file_url: '/portal/uploads/media/draft_post/5/uuid.jpg' },
    ]);
    const { getTelegramClient } = await import('./telegramClient');
    const sendFile = vi.fn(async () => ({ id: 999 }));
    (getTelegramClient as any).mockResolvedValueOnce({ sendFile, sendMessage: vi.fn(async () => ({ id: 999 })) });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: true });
    expect(sendFile).toHaveBeenCalledWith(
      -100123,
      expect.objectContaining({
        file: ['/var/www/aidacamp-dev/uploads/portal/media/draft_post/5/uuid.jpg'],
        caption: 'Текст',
        parseMode: false,
      }),
    );
    expect(setDraftStatus).toHaveBeenCalledWith(5, 'approved', 777);
  });

  it('Finding 2: черновик с видео без фото не теряет текст — уходит отдельным sendMessage', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: 'Подпись к видео', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, tg_parent_channel_id: -100123 });
    const { listMedia } = await import('./portalMedia');
    (listMedia as any).mockResolvedValue([
      { id: 2, file_type: 'video', file_path: 'media/draft_post/5/v.mp4', file_url: '/portal/uploads/media/draft_post/5/v.mp4' },
    ]);
    const { getTelegramClient } = await import('./telegramClient');
    const sendFile = vi.fn(async () => ({ id: 999 }));
    const sendMessage = vi.fn(async () => ({ id: 999 }));
    (getTelegramClient as any).mockResolvedValueOnce({ sendFile, sendMessage });
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r).toEqual({ ok: true });
    expect(sendFile).toHaveBeenCalledWith(
      -100123,
      expect.objectContaining({ file: '/var/www/aidacamp-dev/uploads/portal/media/draft_post/5/v.mp4' }),
    );
    expect(sendMessage).toHaveBeenCalledWith(-100123, { message: 'Подпись к видео', parseMode: false });
  });

  it('Finding 3: черновик уже в статусе approved — отказ без повторной публикации', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'approved', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    // Клиент Telegram намеренно не мокается через mockResolvedValueOnce — если бы код дошёл
    // до публикации, getTelegramClient был бы вызван; проверяем именно то, что он не вызывается.
    const { getTelegramClient } = await import('./telegramClient');
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r.ok).toBe(false);
    expect(getTelegramClient).not.toHaveBeenCalled();
    expect(setDraftStatus).not.toHaveBeenCalled();
  });

  it('Finding 3: черновик уже в статусе rejected — отказ без повторной публикации', async () => {
    const { getDraft, setDraftStatus } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'rejected', text: 'Текст', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getTelegramClient } = await import('./telegramClient');
    const { applyApprove } = await import('./telegramDraftBot');
    const r = await applyApprove(5, 777);
    expect(r.ok).toBe(false);
    expect(getTelegramClient).not.toHaveBeenCalled();
    expect(setDraftStatus).not.toHaveBeenCalled();
  });

  it('Finding 4: во все паблишинг-вызовы передаётся parseMode:false (markdown-парсинг отключён)', async () => {
    const { getDraft } = await import('./draftPost');
    (getDraft as any).mockResolvedValue({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'pending_review', text: '5*5 _привет_', reviewer_chat_id: 777, reviewer_message_id: 1 });
    const { getShiftById } = await import('./portalShift');
    (getShiftById as any).mockResolvedValue({ id: 3, tg_parent_channel_id: -100123 });
    const { listMedia } = await import('./portalMedia');
    (listMedia as any).mockResolvedValue([
      { id: 1, file_type: 'photo', file_path: 'media/draft_post/5/p.jpg' },
      { id: 2, file_type: 'video', file_path: 'media/draft_post/5/v.mp4' },
    ]);
    const { getTelegramClient } = await import('./telegramClient');
    const sendFile = vi.fn(async () => ({ id: 999 }));
    (getTelegramClient as any).mockResolvedValueOnce({ sendFile, sendMessage: vi.fn(async () => ({ id: 999 })) });
    const { applyApprove } = await import('./telegramDraftBot');
    await applyApprove(5, 777);
    expect(sendFile).toHaveBeenCalledTimes(2);
    for (const call of sendFile.mock.calls as any[]) {
      expect(call[1].parseMode).toBe(false);
    }
  });
});
