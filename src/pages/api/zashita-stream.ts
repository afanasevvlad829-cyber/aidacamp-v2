export const prerender = false;
import type { APIRoute } from 'astro';
import { zashitaFolders } from '../../data/zashitaFolders';
import { listPublicVideos, getDirectHref } from '../../lib/ydiskPublic';

// Потоковый прокси для инлайн-плеера. На диск ничего не пишем — байты идут транзитом.
//
// Почему не редирект (как у /api/zashita-file для кнопки «Скачать»): Chrome отдаёт
// <video src> через собственный медиа-пайплайн, который через 302×2 на Яндекс
// получает 403 даже с referrerpolicy=no-referrer — при этом fetch()/curl с теми же
// заголовками проходят нормально. Проверено на проде 17.08.2026. Поэтому для
// плеера сами дотягиваемся до Яндекса и отдаём поток браузеру с себя.
export const GET: APIRoute = async ({ url, request }) => {
  const shiftId = url.searchParams.get('shift') ?? '';
  const name = url.searchParams.get('name') ?? '';
  const folder = zashitaFolders[shiftId];
  if (!folder || !name) return new Response('Not found', { status: 404 });

  const items = await listPublicVideos(folder.publicKey);
  const item = items.find((i) => i.name === name);
  if (!item) return new Response('Not found', { status: 404 });

  const href = await getDirectHref(folder.publicKey, item.path);
  if (!href) return new Response('Ссылка недоступна', { status: 502 });

  const range = request.headers.get('range');
  const upstream = await fetch(href, range ? { headers: { Range: range } } : {});
  if (!upstream.ok && upstream.status !== 206) {
    return new Response('Яндекс.Диск недоступен', { status: 502 });
  }

  const headers = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set('Cache-Control', 'no-store');

  return new Response(upstream.body, { status: upstream.status, headers });
};
