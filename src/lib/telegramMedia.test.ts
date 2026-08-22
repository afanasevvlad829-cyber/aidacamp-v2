import { describe, it, expect } from 'vitest';
import { classifyIncomingMedia } from './telegramMedia';

describe('classifyIncomingMedia', () => {
  it('отклоняет сжатое фото (photo) с инструкцией прислать файлом', () => {
    const r = classifyIncomingMedia({ photo: {} });
    expect(r.accept).toBe(false);
    if (!r.accept) {
      expect(r.instructionText).toContain('Файл');
    }
  });

  it('отклоняет сжатое видео (video) с инструкцией', () => {
    const r = classifyIncomingMedia({ video: {} });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.instructionText).toContain('видео');
  });

  it('принимает document с image/*', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'image/jpeg', size: 5_000_000 } });
    expect(r).toEqual({ accept: true, fileType: 'photo', mime: 'image/jpeg' });
  });

  it('принимает document с video/*', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'video/mp4', size: 50_000_000 } });
    expect(r).toEqual({ accept: true, fileType: 'video', mime: 'video/mp4' });
  });

  it('отклоняет document с посторонним mime', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'application/pdf', size: 100 } });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.reason).toContain('поддерживаются');
  });

  it('отклоняет document крупнее ~300 МБ', () => {
    const r = classifyIncomingMedia({ document: { mimeType: 'video/mp4', size: 320 * 1024 * 1024 } });
    expect(r.accept).toBe(false);
    if (!r.accept) expect(r.reason).toContain('300');
  });

  it('отклоняет сообщение вообще без вложения', () => {
    const r = classifyIncomingMedia({});
    expect(r.accept).toBe(false);
  });
});
