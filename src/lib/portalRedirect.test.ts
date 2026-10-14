import { describe, expect, it } from 'vitest';
import { safeLoginDestination } from './portalRedirect';

describe('safeLoginDestination', () => {
  it('returns Open WebUI after an authenticated staff login', () => {
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
      .toBe('https://ai.aidacamp.ru/');
  });
});
