import { describe, expect, it } from 'vitest';
import { safeLoginDestination } from './portalRedirect';

describe('safeLoginDestination', () => {
  it('returns the AidaPlus Open WebUI after an authenticated staff login', () => {
    expect(safeLoginDestination('https://ai.aidaplus.ru/', 'admin'))
      .toBe('https://ai.aidaplus.ru/');
  });

  it('keeps the previous Open WebUI origin during migration', () => {
    expect(safeLoginDestination('https://ai.aidacamp.ru/', 'admin'))
      .toBe('https://ai.aidacamp.ru/');
  });

  it('keeps portal-local destinations', () => {
    expect(safeLoginDestination('/portal/rooms', 'teacher')).toBe('/portal/rooms');
  });

  it('rejects lookalike and unrelated origins', () => {
    expect(safeLoginDestination('https://ai.aidacamp.ru.evil.example/', 'admin'))
      .toBe('/portal/');
    expect(safeLoginDestination('https://example.com/', 'student'))
      .toBe('https://ai.aidaplus.ru/');
  });
});
