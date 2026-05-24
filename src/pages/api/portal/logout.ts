export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = ({ cookies, redirect }) => {
  cookies.delete('portal_session', { path: '/' });
  return redirect('/portal/login', 303);
};
