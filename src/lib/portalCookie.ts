/**
 * Опции для portal_session cookie.
 * Если переменная окружения PORTAL_COOKIE_DOMAIN задана (например ".aidacamp.ru"),
 * кука пишется на весь домен — позволяет SSO между aidacamp.ru/portal и ai.aidacamp.ru.
 * На localhost (без переменной) Domain не задаётся — кука только на текущем хосте.
 */
export function portalCookieOptions(): {
  httpOnly: true; secure: true; sameSite: 'lax'; path: '/'; maxAge: number; domain?: string;
} {
  const base = {
    httpOnly: true as const,
    secure: true as const,
    sameSite: 'lax' as const,
    path: '/' as const,
    maxAge: 30 * 24 * 60 * 60,
  };
  const domain = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  return domain ? { ...base, domain } : base;
}
