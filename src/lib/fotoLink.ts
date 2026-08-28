import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * fotoLink — подписанные ссылки на альбом смены (/foto/<shiftId>?s=<token>).
 *
 * Зачем: до 27.08.2026 альбомы и API под ними (/api/foto/*) были открыты любому —
 * защитой служило только незнание URL (noindex + отсутствие публичных ссылок).
 * Это фото и распознанные лица детей, обскурити тут недостаточно.
 *
 * Схема повторяет памятка-ссылки (leadLink.ts): HMAC-SHA256, первые 10 hex.
 * Секрет тот же — LEAD_LINK_SECRET, но подписывается строка с префиксом 'foto:',
 * чтобы токен памятки не открывал альбом и наоборот (разделение неймспейсов).
 *
 * Fail-closed: нет секрета → signShiftFoto бросает (ссылка не сгенерируется),
 * verifyShiftFoto отдаёт false (доступ закрыт, а не открыт по умолчанию).
 */
function getSecret(): string {
  const s = process.env.LEAD_LINK_SECRET;
  if (!s) {
    throw new Error('LEAD_LINK_SECRET is not set — refusing to sign/verify foto links (fail-closed).');
  }
  return s;
}

/** Имя куки доступа к альбому конкретной смены. */
export function fotoCookieName(shiftId: string): string {
  return `foto_s_${String(shiftId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

export function signShiftFoto(shiftId: string | number): string {
  return createHmac('sha256', getSecret()).update(`foto:${shiftId}`).digest('hex').slice(0, 10);
}

export function verifyShiftFoto(shiftId: string | number | undefined | null, token: unknown): boolean {
  if (!shiftId) return false;
  if (!token || typeof token !== 'string' || token.length !== 10) return false;
  let expected: string;
  try {
    expected = signShiftFoto(shiftId);
  } catch {
    return false; // нет секрета → доступ закрыт
  }
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildFotoUrl(shiftId: string | number, base = 'https://aidacamp.ru'): string {
  return `${base}/foto/${shiftId}?s=${signShiftFoto(shiftId)}`;
}

/** Опции куки доступа: httpOnly, на 60 дней — сезон фото живёт дольше смены. */
export function fotoCookieOptions(): {
  httpOnly: true; secure: true; sameSite: 'lax'; path: '/'; maxAge: number;
} {
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: 'lax' as const,
    path: '/' as const,
    maxAge: 60 * 24 * 60 * 60,
  };
}
