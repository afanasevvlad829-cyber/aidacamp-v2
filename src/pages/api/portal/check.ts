export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySession } from '../../../lib/portalSession';

/** Для nginx auth_request: 204 = пускать, 401 = нет. */
export const GET: APIRoute = ({ cookies }) => {
  const role = verifySession(
    cookies.get('portal_session')?.value,
    process.env.PORTAL_SESSION_SECRET ?? '',
  );
  return new Response(null, { status: role ? 204 : 401 });
};
