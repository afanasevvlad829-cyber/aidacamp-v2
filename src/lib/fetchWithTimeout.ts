// Обёртка над fetch с таймаутом на основе AbortSignal.timeout.
// Node fetch по умолчанию ждёт ответа бесконечно — зависший внешний сервис
// (AlfaCRM, Telegram) вешает критический путь заявки. Эта обёртка гарантирует,
// что fetch завершится (ошибкой) через timeoutMs миллисекунд, и ошибка ловится
// существующими try/catch на месте вызова.

/**
 * fetch с жёстким таймаутом.
 * @param url     адрес запроса
 * @param init    стандартные опции fetch (signal — при наличии — объединяется с таймаутным)
 * @param timeoutMs таймаут в миллисекундах (по умолчанию 8000)
 * @throws Error с message, содержащим 'timeout', если ответ не пришёл за timeoutMs
 */
export async function fetchWithTimeout(
  url: string | URL | Request,
  init?: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  // Если вызывающий передал свой signal — объединяем, чтобы уважать оба.
  const signal = init?.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetch(url, { ...init, signal });
  } catch (err) {
    // AbortSignal.timeout бросает DOMException с name 'TimeoutError';
    // ручной abort извне — 'AbortError'. Приводим к читаемой ошибке.
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      const target = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      throw new Error(`fetch timeout after ${timeoutMs}ms: ${target}`);
    }
    throw err;
  }
}
