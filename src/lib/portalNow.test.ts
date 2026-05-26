import { describe, it, expect } from 'vitest';
import { pickNowAndNext, relativeTime, checklistProgress } from './portalNow';
import type { ShiftEvent } from './portalShift';

function makeEvent(overrides: Partial<ShiftEvent> & { id: number; start_time: string | null; end_time: string | null }): ShiftEvent {
  return {
    id: overrides.id,
    external_id: null,
    date: '2026-06-10',
    start_time: overrides.start_time,
    end_time: overrides.end_time,
    title: overrides.title ?? `Event ${overrides.id}`,
    activity_type: null,
    event_type: overrides.event_type ?? null,
    activity_slug: null,
    content_task_template_id: null,
    group_color_id: null,
    staff_keys: [],
    roles: overrides.roles ?? ['vozhaty', 'teacher'],
    notes: null,
    sort: overrides.id,
    checklists: overrides.checklists ?? [],
  };
}

const EVENTS: ShiftEvent[] = [
  makeEvent({ id: 1, start_time: '09:00', end_time: '09:45', title: 'Завтрак', roles: ['vozhaty', 'teacher', 'rukovoditel'] }),
  makeEvent({ id: 2, start_time: '10:00', end_time: '11:30', title: 'Урок 1', roles: ['teacher'] }),
  makeEvent({ id: 3, start_time: '12:00', end_time: '13:00', title: 'Обед', roles: ['vozhaty', 'teacher', 'rukovoditel'] }),
  makeEvent({ id: 4, start_time: '14:00', end_time: '15:00', title: 'Свободное время', roles: ['vozhaty'] }),
  makeEvent({ id: 5, start_time: '20:00', end_time: '22:00', title: 'Вечернее мероприятие', roles: ['vozhaty', 'teacher', 'rukovoditel'] }),
];

describe('pickNowAndNext', () => {
  it('returns current running event', () => {
    // 10:15 — inside Урок 1 (10:00-11:30)
    const result = pickNowAndNext(EVENTS, '2026-06-10T10:15:00');
    expect(result.current?.id).toBe(2);
    expect(result.next?.id).toBe(3);
  });

  it('returns nearest event within 15 min when no running event', () => {
    // 11:50 — Обед starts at 12:00 (10 min away), no active event
    const result = pickNowAndNext(EVENTS, '2026-06-10T11:50:00');
    expect(result.current?.id).toBe(3);
    // next after обед should be Свободное время
    expect(result.next?.id).toBe(4);
  });

  it('returns null/null when nothing is current or nearby', () => {
    // 16:00 — no events running, next is 20:00 (4h away) — beyond ±15min
    const result = pickNowAndNext(EVENTS, '2026-06-10T16:00:00');
    expect(result.current).toBeNull();
    expect(result.next?.id).toBe(5);
  });

  it('filters by role', () => {
    // 10:15 — Урок 1 is for 'teacher' only, vozhaty should not see it as current
    const result = pickNowAndNext(EVENTS, '2026-06-10T10:15:00', 'vozhaty');
    expect(result.current).toBeNull();
    // next for vozhaty after 10:15 is Обед at 12:00 (not within 15min)
    expect(result.next?.id).toBe(3);
  });

  it('returns null/null on a different date (outside shift days)', () => {
    // Events are on 2026-06-10, but we're asking about 2026-06-15
    const result = pickNowAndNext(EVENTS, '2026-06-15T10:15:00');
    expect(result.current).toBeNull();
    expect(result.next).toBeNull();
  });

  it('admin sees all events regardless of roles', () => {
    // 10:15 — Урок 1 is teacher-only, admin sees it
    const result = pickNowAndNext(EVENTS, '2026-06-10T10:15:00', 'admin');
    expect(result.current?.id).toBe(2);
  });
});

describe('relativeTime', () => {
  it('returns "через N мин" for near future', () => {
    // now = 10:00, start = 10:20 => 20 min
    const now = '2026-06-10T10:00:00';
    expect(relativeTime('10:20:00', now)).toBe('через 20 мин');
  });

  it('returns clock time for distant future', () => {
    const now = '2026-06-10T10:00:00';
    expect(relativeTime('14:00:00', now)).toBe('в 14:00');
  });
});

describe('checklistProgress', () => {
  it('counts done/total correctly', () => {
    const event: ShiftEvent = {
      ...makeEvent({ id: 10, start_time: '10:00', end_time: '11:00' }),
      checklists: [
        {
          event_checklist_id: 1,
          checklist_id: 100,
          title: 'Чек-лист',
          roles: ['vozhaty'],
          items: [{ id: 'a', text: 'Пункт 1' }, { id: 'b', text: 'Пункт 2' }, { id: 'c', text: 'Пункт 3' }],
        },
      ],
    };
    const doneSet = new Set<string>(['10:100:a', '10:100:b']);
    const { done, total } = checklistProgress(event, doneSet, 'vozhaty');
    expect(done).toBe(2);
    expect(total).toBe(3);
  });
});
