// src/lib/portalLog.ts
// Лёгкое структурированное логирование событий входа в портал.
// Пишет одну строку в stdout сервиса (видно в `journalctl -u aidacamp-dev`).
// Намеренно НЕ логируем токены/подписи/пароли — только факт попытки и её исход.

export type AuthMethod = 'tg-miniapp' | 'tg-widget' | 'code';
export type AuthOutcome =
  | 'success'
  | 'invalid' // подпись Telegram не прошла / нет валидного пользователя
  | 'pending' // нет в whitelist или роль не назначена — заявка
  | 'revoked' // аккаунт деактивирован
  | 'bad-code'; // неверный код входа (для метода code)

export interface AuthLogFields {
  method: AuthMethod;
  outcome: AuthOutcome;
  telegramId?: number | null;
  role?: string | null;
  ip?: string | null;
}

/** Извлечь клиентский IP из заголовков запроса (за reverse-proxy). */
export function clientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * Записать событие входа. Формат строки (стабильный, удобный для grep):
 *   [portal/auth] outcome=success method=tg-miniapp tg_id=790500740 role=admin ip=1.2.3.4
 */
export function logAuth(f: AuthLogFields): void {
  const parts = [
    `outcome=${f.outcome}`,
    `method=${f.method}`,
    `tg_id=${f.telegramId ?? '-'}`,
    `role=${f.role ?? '-'}`,
    `ip=${f.ip ?? '-'}`,
  ];
  const line = `[portal/auth] ${parts.join(' ')}`;
  if (f.outcome === 'success') console.log(line);
  else console.warn(line);
}
