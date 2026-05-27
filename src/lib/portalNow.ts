import type { ShiftEvent } from './portalShift';
import type { PortalRole } from './portalSession';
import { roleAllowed } from './portalShiftRoles';

export interface NowAndNext {
  current: ShiftEvent | null;
  next: ShiftEvent | null;
}

/**
 * Picks current and next events from today's events list.
 *
 * "current" = event where start_time <= now <= end_time,
 *   OR the nearest event within ±15 minutes if no active event found.
 * "next"    = nearest future event after the current one (or after now if no current).
 *
 * If `role` is passed, only events where roleAllowed(role, e.roles) are considered.
 * If nowISO is outside the shift's events dates, returns { current: null, next: null }.
 */
export function pickNowAndNext(
  events: ShiftEvent[],
  nowISO?: string,
  role?: PortalRole,
): NowAndNext {
  const nowDate = nowISO ? new Date(nowISO) : new Date();
  const todayStr = nowISO
    ? nowISO.slice(0, 10)
    : nowDate.toISOString().slice(0, 10);

  // Filter to today's events only
  let todayEvents = events.filter((e) => e.date === todayStr);

  // Filter by role if provided
  if (role) {
    todayEvents = todayEvents.filter((e) => roleAllowed(role, e.roles));
  }

  if (todayEvents.length === 0) {
    return { current: null, next: null };
  }

  // Get current time as minutes since midnight for comparison
  const nowH = nowDate.getHours();
  const nowM = nowDate.getMinutes();
  const nowMinutes = nowH * 60 + nowM;

  function toMinutes(t: string | null): number | null {
    if (!t) return null;
    const parts = t.split(':');
    if (parts.length < 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }

  // 1. Find a running event: start_time <= now <= end_time
  let current: ShiftEvent | null = null;
  for (const e of todayEvents) {
    const start = toMinutes(e.start_time);
    const end = toMinutes(e.end_time);
    if (start !== null && end !== null && start <= nowMinutes && nowMinutes <= end) {
      current = e;
      break;
    }
  }

  // 2. If no running event, find nearest within ±15 minutes
  if (!current) {
    let closestDiff = Infinity;
    for (const e of todayEvents) {
      const start = toMinutes(e.start_time);
      if (start === null) continue;
      const diff = Math.abs(start - nowMinutes);
      if (diff <= 15 && diff < closestDiff) {
        closestDiff = diff;
        current = e;
      }
    }
  }

  // 3. Find next: nearest future event after current (or after now if no current)
  const afterMinutes = current
    ? (toMinutes(current.start_time) ?? nowMinutes)
    : nowMinutes;

  let next: ShiftEvent | null = null;
  let nextStart = Infinity;
  for (const e of todayEvents) {
    if (e === current) continue;
    const start = toMinutes(e.start_time);
    if (start === null) continue;
    if (start > afterMinutes && start < nextStart) {
      nextStart = start;
      next = e;
    }
  }

  return { current, next };
}

/**
 * Formats relative time string: "через N мин", "через N ч", "в HH:MM"
 * threshold: if > 90 minutes away, shows clock time.
 */
export function relativeTime(startTime: string | null, nowISO?: string): string {
  if (!startTime) return '';
  const nowDate = nowISO ? new Date(nowISO) : new Date();
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();
  const parts = startTime.split(':');
  if (parts.length < 2) return startTime;
  const startMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  const diff = startMinutes - nowMinutes;
  if (diff <= 0) return `в ${startTime.slice(0, 5)}`;
  if (diff < 60) return `через ${diff} мин`;
  if (diff < 90) return `через 1 ч`;
  return `в ${startTime.slice(0, 5)}`;
}

/**
 * Returns checklist progress for events where role is allowed.
 * Returns { done, total }.
 */
export function checklistProgress(
  event: ShiftEvent,
  doneSet: Set<string>,
  role?: PortalRole,
): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const cl of event.checklists) {
    if (role && !roleAllowed(role, cl.roles)) continue;
    for (const item of cl.items) {
      total++;
      if (doneSet.has(`${event.id}:${cl.checklist_id}:${item.id}`)) done++;
    }
  }
  return { done, total };
}
