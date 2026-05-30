import { describe, it, expect } from 'vitest';
import { tierOf, isStaff, can, ROLE_LABELS } from './portalPerms';

describe('tierOf', () => {
  it('admin → admin', () => expect(tierOf('admin')).toBe('admin'));
  it('rukovoditel → rukovoditel', () => expect(tierOf('rukovoditel')).toBe('rukovoditel'));
  it('teacher → staff', () => expect(tierOf('teacher')).toBe('staff'));
  it('vozhaty → staff', () => expect(tierOf('vozhaty')).toBe('staff'));
  it('student → null', () => expect(tierOf('student')).toBeNull());
  it('unknown → null', () => expect(tierOf('unknown')).toBeNull());
});

describe('isStaff', () => {
  it('admin is staff', () => expect(isStaff('admin')).toBe(true));
  it('rukovoditel is staff', () => expect(isStaff('rukovoditel')).toBe(true));
  it('teacher is staff', () => expect(isStaff('teacher')).toBe(true));
  it('vozhaty is staff', () => expect(isStaff('vozhaty')).toBe(true));
  it('student is NOT staff', () => expect(isStaff('student')).toBe(false));
});

describe('can - MANAGE_USERS', () => {
  it('admin can MANAGE_USERS', () => expect(can('admin', 'MANAGE_USERS')).toBe(true));
  it('rukovoditel cannot MANAGE_USERS', () => expect(can('rukovoditel', 'MANAGE_USERS')).toBe(false));
  it('teacher cannot MANAGE_USERS', () => expect(can('teacher', 'MANAGE_USERS')).toBe(false));
  it('vozhaty cannot MANAGE_USERS', () => expect(can('vozhaty', 'MANAGE_USERS')).toBe(false));
  it('student cannot MANAGE_USERS', () => expect(can('student', 'MANAGE_USERS')).toBe(false));
});

describe('can - ASSIGN_RESPONSIBLES', () => {
  it('admin can ASSIGN_RESPONSIBLES', () => expect(can('admin', 'ASSIGN_RESPONSIBLES')).toBe(true));
  it('rukovoditel can ASSIGN_RESPONSIBLES', () => expect(can('rukovoditel', 'ASSIGN_RESPONSIBLES')).toBe(true));
  it('vozhaty cannot ASSIGN_RESPONSIBLES', () => expect(can('vozhaty', 'ASSIGN_RESPONSIBLES')).toBe(false));
  it('teacher cannot ASSIGN_RESPONSIBLES', () => expect(can('teacher', 'ASSIGN_RESPONSIBLES')).toBe(false));
  it('student cannot ASSIGN_RESPONSIBLES', () => expect(can('student', 'ASSIGN_RESPONSIBLES')).toBe(false));
});

describe('ROLE_LABELS', () => {
  it('has all 5 roles', () => {
    expect(ROLE_LABELS.admin).toBe('Админ');
    expect(ROLE_LABELS.rukovoditel).toBe('Руководитель');
    expect(ROLE_LABELS.teacher).toBe('Преподаватель');
    expect(ROLE_LABELS.vozhaty).toBe('Вожатый');
    expect(ROLE_LABELS.student).toBe('Ученик');
  });
});
