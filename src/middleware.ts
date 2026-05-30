import type { MiddlewareHandler } from 'astro';
import { verifySessionPayload } from './lib/portalSession';
import { getStaff } from './lib/portalStaff';

const PORTAL_PUBLIC = new Set(['/portal/login', '/portal/login/', '/portal/tg-app', '/api/portal/login', '/api/portal/check', '/api/portal/tg', '/api/portal/penalty/scan']);

const staffActiveCache = new Map<number, { ok: boolean; role: string | null; roles: string[]; exp: number }>();
const STAFF_CACHE_MS = 60_000;

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

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { request, url, cookies, locals } = context;
  const path = url.pathname;

  // ── Гейт портала ───────────────────────────────────────────────
  if (path.startsWith('/portal') || path.startsWith('/api/portal')) {
    const cleanPortal = path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const isPublic = PORTAL_PUBLIC.has(path) || PORTAL_PUBLIC.has(cleanPortal);
    if (!isPublic) {
      const payload = verifySessionPayload(
        cookies.get('portal_session')?.value,
        process.env.PORTAL_SESSION_SECRET ?? '',
      );
      let role = payload?.role ?? null;
      // Для сотрудничьих сессий (есть sub) — проверяем active/role в БД (кэш 60с).
      // Student-сессии тоже имеют sub (это portal_kid.id), но к portal_staff отношения не имеют —
      // их валидировать через getStaff() нельзя (всегда вернёт null → 401). Пропускаем.
      let staffRoles: string[] = [];
      if (role && role !== 'student' && payload?.sub) {
        const now = Date.now();
        let c = staffActiveCache.get(payload.sub);
        if (!c || c.exp < now) {
          const staff = await getStaff(payload.sub);
          const allRoles: string[] = Array.isArray(staff?.roles) && staff!.roles.length > 0
            ? (staff!.roles as string[])
            : (staff?.role ? [staff.role as string] : []);
          c = {
            ok: !!staff?.active && allRoles.length > 0,
            role: staff?.role ?? null,
            roles: allRoles,
            exp: now + STAFF_CACHE_MS,
          };
          staffActiveCache.set(payload.sub, c);
        }
        if (!c.ok) {
          role = null;
        } else {
          // У сотрудника может быть несколько ролей в roles[]. Чтобы admin/руководитель
          // не оказался под teacher-сессией и не терял доступ к admin-страницам, берём
          // НАИВЫСШУЮ доступную роль как реальную. View-as даёт ручной даунгрейд.
          const PRIORITY = ['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student'] as const;
          const highest = PRIORITY.find((r) => c.roles.includes(r as any)) as any;
          if (highest) role = highest;
          else if (!c.roles.includes(role)) role = c.roles[0] as any;
        }
        staffRoles = c.roles;
      }
      if (!role) {
        if (path.startsWith('/api/')) return new Response('Unauthorized', { status: 401 });
        // Относительный Location: за reverse-proxy абсолютный URL берёт
        // внутренний origin адаптера (localhost:4181) и ломает редирект в браузере.
        const location = `/portal/login?next=${encodeURIComponent(path)}`;
        return new Response(null, { status: 302, headers: { Location: location } });
      }
      locals.portalRole = role as any;
      locals.portalRoles = staffRoles as any;
    }
  }

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
