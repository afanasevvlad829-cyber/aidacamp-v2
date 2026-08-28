import { describe, it, expect } from 'vitest';
import { canEditEvent } from './portalShiftPerms';

describe('canEditEvent', () => {
  it('admin может всегда', () => {
    expect(canEditEvent('admin', [])).toBe(true);
    expect(canEditEvent('admin', ['teacher'])).toBe(true);
    expect(canEditEvent('admin', null)).toBe(true);
  });
  it('rukovoditel может всегда', () => {
    expect(canEditEvent('rukovoditel', [])).toBe(true);
    expect(canEditEvent('rukovoditel', ['vozhaty'])).toBe(true);
  });
  // Ограничения по ролям сняты (ab820070): править может любой сотрудник кроме student,
  // eventRoles больше не влияет.
  it('teacher — любые события, eventRoles не влияет', () => {
    expect(canEditEvent('teacher', ['teacher', 'vozhaty'])).toBe(true);
    expect(canEditEvent('teacher', ['vozhaty'])).toBe(true);
    expect(canEditEvent('teacher', [])).toBe(true);
    expect(canEditEvent('teacher', null)).toBe(true);
  });
  it('vozhaty — любые события, eventRoles не влияет', () => {
    expect(canEditEvent('vozhaty', ['vozhaty'])).toBe(true);
    expect(canEditEvent('vozhaty', ['teacher'])).toBe(true);
  });
  it('student — никогда', () => {
    expect(canEditEvent('student', ['student'])).toBe(false);
    expect(canEditEvent('student', null)).toBe(false);
  });
  it('null role — никогда', () => {
    expect(canEditEvent(null, ['admin'])).toBe(false);
    expect(canEditEvent(undefined, ['admin'])).toBe(false);
  });
});
