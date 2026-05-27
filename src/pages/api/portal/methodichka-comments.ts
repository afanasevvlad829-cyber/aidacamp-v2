export const prerender = false;
import type { APIRoute } from 'astro';
import { verifySessionPayload } from '../../../lib/portalSession';
import { listComments, listHistory, createComment, archiveComment } from '../../../lib/portalMethodichkaComments';

const ALLOWED = new Set(['admin', 'teacher', 'vozhaty', 'rukovoditel']);

function auth(cookies: Parameters<APIRoute>[0]['cookies']) {
  const p = verifySessionPayload(cookies.get('portal_session')?.value, process.env.PORTAL_SESSION_SECRET ?? '');
  if (!p) return null;
  if (!ALLOWED.has(p.role)) return null;
  return p as any;
}

const j = (x: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });

export const GET: APIRoute = async ({ cookies, url }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const slug = String(url.searchParams.get('slug') || '').trim();
  const history = url.searchParams.get('history');
  if (history) {
    const items = await listHistory(Number(history));
    return j({ ok: true, items });
  }
  if (!slug) return j({ ok: false, error: 'slug required' }, { status: 400 });
  const items = await listComments(slug);
  return j({ ok: true, items });
};

export const POST: APIRoute = async ({ cookies, request }) => {
  const p = auth(cookies); if (!p) return j({ ok: false, error: 'forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({} as any));
  const action = String(body.action || 'create');
  const author = String(p.sub || p.role || 'admin');
  const authorName = String(p.name || p.role || 'admin');

  try {
    if (action === 'create') {
      const slug = String(body.slug || '').trim();
      const text = String(body.body || '').trim();
      if (!slug) return j({ ok: false, error: 'slug required' }, { status: 400 });
      if (!text) return j({ ok: false, error: 'body required' }, { status: 400 });
      const id = await createComment({
        slug,
        body: text,
        source: body.source === 'voice' ? 'voice' : 'text',
        author,
        author_name: authorName,
        parent_id: body.parent_id ? Number(body.parent_id) : null,
      });
      return j({ ok: true, id });
    }
    if (action === 'archive') {
      const id = Number(body.id);
      if (!id) return j({ ok: false, error: 'id required' }, { status: 400 });
      await archiveComment(id);
      return j({ ok: true });
    }
    return j({ ok: false, error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return j({ ok: false, error: 'server-error', detail: e?.message }, { status: 500 });
  }
};
