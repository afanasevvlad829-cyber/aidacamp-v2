export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';
import { listComments, listHistory, createComment, archiveComment } from '../../../lib/portalMethodichkaComments';

const ALLOWED = new Set(['admin', 'teacher', 'vozhaty', 'rukovoditel']);


const j = (x: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(x), { headers: { 'Content-Type': 'application/json' }, ...init });

export const GET: APIRoute = async ({ locals, url }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
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

export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  const body = await request.json().catch(() => ({} as any));
  const action = String(body.action || 'create');
  const author = String(sub || role || 'admin');
  const authorName = String(p.name || role || 'admin');

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
