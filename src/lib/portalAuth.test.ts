import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRole } from './portalAuth';

describe('resolveRole', () => {
  beforeEach(() => {
    process.env.PORTAL_PWD_ADMIN = 'admin-pw';
    process.env.PORTAL_PWD_STUDENT = 'student-pw';
    delete process.env.PORTAL_PWD_TEACHER;
    delete process.env.PORTAL_PWD_VOZHATY;
    delete process.env.PORTAL_PWD_RUKOVODITEL;
  });

  it('сопоставляет код ученика и break-glass admin', () => {
    expect(resolveRole('admin-pw')).toBe('admin');
    expect(resolveRole('student-pw')).toBe('student');
  });

  it('пароли сотрудников больше не работают', () => {
    process.env.PORTAL_PWD_TEACHER = 'teacher-pw';
    expect(resolveRole('teacher-pw')).toBeNull();
  });

  it('возвращает null на неверный/пустой', () => {
    expect(resolveRole('nope')).toBeNull();
    expect(resolveRole('')).toBeNull();
  });
});
