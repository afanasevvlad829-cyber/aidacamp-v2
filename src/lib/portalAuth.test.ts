import { describe, it, expect, beforeEach } from 'vitest';
import { resolveRole } from './portalAuth';

describe('resolveRole', () => {
  beforeEach(() => {
    process.env.PORTAL_PWD_ADMIN = 'admin-pw';
    process.env.PORTAL_PWD_TEACHER = 'teacher-pw';
    process.env.PORTAL_PWD_STUDENT = 'student-pw';
    process.env.PORTAL_PWD_VOZHATY = 'vozhaty-pw';
    process.env.PORTAL_PWD_RUKOVODITEL = 'rukovoditel-pw';
  });

  it('сопоставляет пароль роли', () => {
    expect(resolveRole('admin-pw')).toBe('admin');
    expect(resolveRole('teacher-pw')).toBe('teacher');
    expect(resolveRole('student-pw')).toBe('student');
    expect(resolveRole('vozhaty-pw')).toBe('vozhaty');
    expect(resolveRole('rukovoditel-pw')).toBe('rukovoditel');
  });

  it('возвращает null на неверный пароль', () => {
    expect(resolveRole('nope')).toBeNull();
    expect(resolveRole('')).toBeNull();
  });

  it('игнорирует роль с незаданным паролем', () => {
    delete process.env.PORTAL_PWD_ADMIN;
    expect(resolveRole('')).toBeNull();
  });
});
