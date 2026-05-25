import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export interface TgUser {
  telegram_id: number;
  username?: string;
  name?: string;
}

const MAX_AGE_SEC = 24 * 60 * 60;

function safeHexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function freshAuthDate(authDate: string | undefined, now = Date.now()): boolean {
  const t = Number(authDate);
  if (!Number.isFinite(t)) return false;
  return now / 1000 - t <= MAX_AGE_SEC;
}

function toUser(fields: Record<string, string>): TgUser | null {
  const id = Number(fields.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    telegram_id: id,
    username: fields.username || undefined,
    name: [fields.first_name, fields.last_name].filter(Boolean).join(' ') || undefined,
  };
}

/** Telegram Login Widget: secret = SHA256(token). */
export function verifyLoginWidget(
  params: Record<string, string>,
  token: string,
  now = Date.now(),
): TgUser | null {
  if (!token || !params.hash) return null;
  const { hash, ...data } = params;
  if (!freshAuthDate(data.auth_date, now)) return null;
  const checkString = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join('\n');
  const secret = createHash('sha256').update(token).digest();
  const expected = createHmac('sha256', secret).update(checkString).digest('hex');
  if (!safeHexEqual(expected, hash)) return null;
  return toUser(data);
}

/** Mini App initData: secret = HMAC_SHA256(key="WebAppData", token). */
export function verifyInitData(initData: string, token: string, now = Date.now()): TgUser | null {
  if (!token || !initData) return null;
  const sp = new URLSearchParams(initData);
  const hash = sp.get('hash');
  if (!hash) return null;
  sp.delete('hash');
  const entries: string[] = [];
  for (const [k, v] of [...sp.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    entries.push(`${k}=${v}`);
  }
  const authDate = sp.get('auth_date') ?? undefined;
  if (!freshAuthDate(authDate, now)) return null;
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', secret).update(entries.join('\n')).digest('hex');
  if (!safeHexEqual(expected, hash)) return null;
  let userField: Record<string, unknown> = {};
  try {
    userField = JSON.parse(sp.get('user') ?? '{}');
  } catch {
    return null;
  }
  const id = Number(userField.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    telegram_id: id,
    username: (userField.username as string) || undefined,
    name: [userField.first_name, userField.last_name].filter(Boolean).join(' ') || undefined,
  };
}
