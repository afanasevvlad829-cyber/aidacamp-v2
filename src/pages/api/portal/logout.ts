export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ cookies, redirect }) => {
  const domain = process.env.PORTAL_COOKIE_DOMAIN?.trim();
  cookies.delete('portal_session', domain ? { path: '/', domain } : { path: '/' });
  return redirect('/portal/login', 303);
};
