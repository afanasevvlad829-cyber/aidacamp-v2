import type { MiddlewareHandler } from 'astro';

const ipCounts = new Map<string, { count: number; reset: number }>();

export const onRequest: MiddlewareHandler = async ({ request, url }, next) => {
  if (url.pathname === '/api/ask') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const now = Date.now();
    const entry = ipCounts.get(ip) ?? { count: 0, reset: now + 60000 };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + 60000; }
    entry.count++;
    ipCounts.set(ip, entry);

    if (entry.count > 20) {
      return new Response(
        JSON.stringify({
          state: 'error',
          text: 'Слишком много запросов. Пожалуйста, подождите минуту.',
          block_type: null,
          block_data: null,
          chips: [{ label: 'Написать в WhatsApp', query: 'хочу поговорить с человеком' }],
        }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  return next();
};
