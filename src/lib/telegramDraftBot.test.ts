import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./portalStaff', () => ({
  getStaff: vi.fn(),
}));
vi.mock('./portalShift', () => ({
  getActiveShift: vi.fn(async () => ({ id: 3, name: 'Смена', start_date: '2026-06-10', end_date: '2026-06-23', status: 'active' })),
}));
vi.mock('./draftPost', () => ({
  getOrCreateCollectingDraft: vi.fn(async () => ({ id: 5, shift_id: 3, author_telegram_id: 111, status: 'collecting', text: null, reviewer_chat_id: null, reviewer_message_id: null })),
  appendDraftText: vi.fn(async () => {}),
  setDraftStatus: vi.fn(async () => {}),
  setReviewerMessage: vi.fn(async () => {}),
}));
vi.mock('./portalMedia', () => ({
  attachMedia: vi.fn(async () => 42),
  listMedia: vi.fn(async () => []),
}));
vi.mock('./db', () => ({
  query: vi.fn(async () => []),
  withDbClient: vi.fn(),
}));
vi.mock('fs/promises', () => ({ mkdir: vi.fn(async () => {}), writeFile: vi.fn(async () => {}) }));
vi.mock('./telegramClient', () => ({
  getTelegramClient: vi.fn(async () => ({
    downloadMedia: vi.fn(async () => Buffer.from('fake-bytes')),
    sendMessage: vi.fn(async () => ({ id: 999 })),
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
