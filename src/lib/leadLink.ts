import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Секрет подписи памятка-ссылок. Fail-closed: нет LEAD_LINK_SECRET → бросаем.
 * Раньше был фолбэк 'aidacamp-dev-only-change-me' — публичный репозиторий делал
 * подпись предсказуемой (любой мог подделать токен). Теперь без секрета signLid
 * бросает (ссылка не сгенерируется), а verifyLid отдаёт false (доступ закрыт).
 */
function getSecret(): string {
  const s = process.env.LEAD_LINK_SECRET;
  if (!s) {
    throw new Error('LEAD_LINK_SECRET is not set — refusing to sign/verify lead links (fail-closed).');
  }
  return s;
}

export function signLid(lid: string | number): string {
  const h = createHmac('sha256', getSecret()).update(String(lid)).digest('hex');
  return h.slice(0, 10);
}

export function verifyLid(lid: string | number, token: string): boolean {
  if (!token || typeof token !== 'string' || token.length !== 10) return false;
  let expected: string;
  try {
    expected = signLid(lid);
  } catch {
    return false; // нет секрета → доступ закрыт
  }
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildPamyatkaUrl(lid: string | number, base = 'https://aidacamp.ru'): string {
  return `${base}/p/${lid}?t=${signLid(lid)}`;
}
