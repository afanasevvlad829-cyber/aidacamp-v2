import { createHmac, timingSafeEqual } from 'node:crypto';

const SECRET = process.env.LEAD_LINK_SECRET || 'aidacamp-dev-only-change-me';

export function signLid(lid: string | number): string {
  const h = createHmac('sha256', SECRET).update(String(lid)).digest('hex');
  return h.slice(0, 10);
}

export function verifyLid(lid: string | number, token: string): boolean {
  if (!token || typeof token !== 'string' || token.length !== 10) return false;
  const expected = signLid(lid);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildPamyatkaUrl(lid: string | number, base = 'https://aidacamp.ru'): string {
  return `${base}/p/${lid}?t=${signLid(lid)}`;
}
