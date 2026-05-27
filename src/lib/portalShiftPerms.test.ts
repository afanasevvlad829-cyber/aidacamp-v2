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
  it('teacher — только свои события', () => {
    expect(canEditEvent('teacher', ['teacher', 'vozhaty'])).toBe(true);
    expect(canEditEvent('teacher', ['vozhaty'])).toBe(false);
    expect(canEditEvent('teacher', [])).toBe(false);
    expect(canEditEvent('teacher', null)).toBe(false);
  });
  it('vozhaty — только свои события', () => {
    expect(canEditEvent('vozhaty', ['vozhaty'])).toBe(true);
    expect(canEditEvent('vozhaty', ['teacher'])).toBe(false);
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
