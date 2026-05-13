import type { MiddlewareHandler } from 'astro';

// ─── 301 Redirects ──────────────────────────────────────────────────────────

const TILDA_REDIRECTS: Record<string, string> = {
  '/about': '/',
  '/catalog': '/ceny/',
  '/subrent': '/',
  '/cookies': '/privacy/',
  '/pine-camp-v2': '/',
  '/svedeniya-ob-obrazovatelnoj-organizacii': '/requisites/',
  '/programmirovanei-dlya-detey-7-let': '/lager-7-let/',
  '/programmirovanei-dlya-detey-8-let': '/lager-8-let/',
  '/programmirovanei-dlya-detey-9-let': '/lager-9-let/',
  '/programmirovanei-dlya-detey-10-let': '/lager-10-let/',
  '/programmirovanei-dlya-detey-11-let': '/lager-11-let/',
  '/programmirovanei-dlya-detey-12-let': '/lager-12-let/',
  '/programmirovanei-dlya-detey-13-let': '/lager-12-let/',
  '/programmirovanei-dlya-detey-14-let': '/lager-14-let/',
  '/programmirovanie-dlya-detei-s-nulya': '/stati/programmirovanie-dlya-detej-s-nulya/',
  '/programmirovanie-dlya-shkolnikov': '/kompyuternyy-lager/',
  '/programmirovanie-dlya-vzroslyh': '/',
  // Duplicate slug: -ey → canonical -ej
  '/stati/reiting-detskih-lagerey-podmoskove': '/stati/reiting-detskih-lagerej-podmoskove/',
  '/stati/reiting-detskih-lagerey-podmoskove/': '/stati/reiting-detskih-lagerej-podmoskove/',
};

// ─── Rate limiter state ─────────────────────────────────────────────────────

const ipCounts = new Map<string, { count: number; reset: number }>();

export const onRequest: MiddlewareHandler = async ({ request, url }, next) => {
  const path = url.pathname;

  // /blog/* → /stati/* (301)
  if (path === '/blog/' || path === '/blog') {
    return Response.redirect(new URL('/stati/', url), 301);
  }
  if (path.startsWith('/blog/')) {
    return Response.redirect(new URL(path.replace('/blog/', '/stati/'), url), 301);
  }

  // Tilda legacy URLs + duplicate reiting slug (301)
  const cleanPath = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
  const target = TILDA_REDIRECTS[path] ?? TILDA_REDIRECTS[cleanPath];
  if (target) {
    return Response.redirect(new URL(target, url), 301);
  }

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
  const response = await next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
};
