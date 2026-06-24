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

// ─── Action log (DB) ────────────────────────────────────────────────────────

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }

export interface ActionLogFields {
  staffId?: number | null;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  payload?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Записать действие сотрудника в portal_action_log. Fire-and-forget. */
export function logAction(f: ActionLogFields): void {
  const conn = dsn();
  if (!conn) return;
  (async () => {
    try {
      const { default: pg } = await import('pg');
      const client = new pg.Client({ connectionString: conn });
      await client.connect();
      try {
        await client.query(
          `INSERT INTO portal_action_log(staff_id, action, entity_type, entity_id, payload, ip)
           VALUES($1,$2,$3,$4,$5,$6)`,
          [
            f.staffId ?? null, f.action,
            f.entityType ?? null, f.entityId ?? null,
            f.payload ? JSON.stringify(f.payload) : null,
            f.ip ?? null,
          ],
        );
      } finally { await client.end(); }
    } catch { /* не мешаем основному флоу */ }
  })();
}

/** Обновить last_seen_at — не чаще раза в 5 минут. Fire-and-forget. */
const _lastSeenFlush = new Map<number, number>();
export function touchLastSeen(staffId: number): void {
  const now = Date.now();
  if ((_lastSeenFlush.get(staffId) ?? 0) + 300_000 > now) return;
  _lastSeenFlush.set(staffId, now);
  const conn = dsn();
  if (!conn) return;
  (async () => {
    try {
      const { default: pg } = await import('pg');
      const client = new pg.Client({ connectionString: conn });
      await client.connect();
      try {
        await client.query('UPDATE portal_staff SET last_seen_at=now() WHERE id=$1', [staffId]);
      } finally { await client.end(); }
    } catch { /* fire-and-forget */ }
  })();
}
