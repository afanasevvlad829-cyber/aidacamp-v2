export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';
import { getContentItem, readOriginal, readThumb } from '../../../lib/portalShiftContent';

/**
 * Отдаёт кадр, сданный в бота смены: `?id=N&size=thumb|full`.
 *
 * Хранилище бота (/var/lib/shift-content) наружу через nginx НЕ открыто и
 * открыто быть не должно — там дети. Единственный путь к этим файлам —
 * этот маршрут, за той же проверкой сотрудника, что и весь /portal.
 */
export const GET: APIRoute = async ({ locals, url }) => {
  const auth = requireStaff(locals);
  if (auth instanceof Response) return auth;

  const id = Number(url.searchParams.get('id') || 0);
  if (!id) return new Response('id required', { status: 400 });

  const item = await getContentItem(id);
  if (!item) return new Response('not found', { status: 404 });

  const wantFull = url.searchParams.get('size') === 'full';

  if (!wantFull) {
    const thumb = await readThumb(item);
    if (thumb) {
      return new Response(new Uint8Array(thumb), {
        headers: {
          'Content-Type': 'image/jpeg',
          // кадр по id неизменен — можно кэшировать надолго, но только в браузере
          'Cache-Control': 'private, max-age=86400',
        },
      });
    }
    // голосовые и битые файлы превью не имеют — пусть плитка покажет заглушку
    return new Response('no preview', { status: 404 });
  }

  const orig = await readOriginal(item);
  if (!orig) return new Response('file missing', { status: 404 });
  return new Response(new Uint8Array(orig.buf), {
    headers: {
      'Content-Type': orig.type,
      'Content-Disposition': `inline; filename="${encodeURIComponent(orig.name)}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
};
