/**
 * staffAuth — единая точка правды по авторизации внутренних инструментов /staff
 * (портал сотрудников + конструктор смены /staff/plan).
 *
 * Секрет — STAFF_AUTH_SECRET (общий пароль вожатых), лежит в /var/www/aidacamp/.env.prod.
 * Fail-closed: нет секрета → фича закрыта (getStaffSecret() === null), вызывающий отдаёт 503.
 * Пароль НИКОГДА не проверяется в браузере — только сервером (/api/staff-login).
 *
 * Кука staff_auth_2026 несёт сам секрет как bearer-токен: значение неугадываемо
 * (STAFF_AUTH_SECRET случаен), httpOnly → недоступно JS, ставит его только сервер
 * после проверки пароля. Сравнение куки с секретом — тоже на сервере (shift-plan.ts).
 */
import { timingSafeEqual } from 'node:crypto';

export const STAFF_COOKIE = 'staff_auth_2026';

/** Секрет доступа к /staff. null → фича закрыта (fail-closed, отдать 503). */
export function getStaffSecret(): string | null {
  const s = process.env.STAFF_AUTH_SECRET;
  return s && s.length > 0 ? s : null;
}

/** Сравнение в постоянном времени. Разные длины / ошибка → false, не бросаем. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  try {
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Пароль верен? (пароль === секрет) */
export function checkStaffPassword(input: unknown, secret: string): boolean {
  if (typeof input !== 'string' || input.length === 0) return false;
  return safeEqual(input, secret);
}

/** Кука авторизации валидна? (значение куки === секрет) */
export function isStaffAuthed(cookieValue: string | undefined | null, secret: string): boolean {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, secret);
}

/** Опции куки авторизации. remember → 30 дней, иначе 1 день. */
export function staffCookieOptions(remember: boolean): {
  httpOnly: true; secure: true; sameSite: 'lax'; path: '/'; maxAge: number;
} {
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: 'lax' as const,
    path: '/' as const,
    maxAge: (remember ? 30 : 1) * 24 * 60 * 60,
  };
}
