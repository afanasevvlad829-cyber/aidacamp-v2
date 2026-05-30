export const prerender = false;
import type { APIRoute } from 'astro';

function doLogout({ cookies, url, redirect }: any) {
  const domain = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  cookies.delete('portal_session',  domain ? { path: '/', domain } : { path: '/' });
  const next = url?.searchParams?.get?.('next') || '/portal/login';
  return redirect(next, 303);
}

export const POST: APIRoute = (ctx) => doLogout(ctx);
export const GET:  APIRoute = (ctx) => doLogout(ctx);
