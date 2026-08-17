export const prerender = false;
import type { APIRoute } from 'astro';
import { zashitaFolders } from '../../data/zashitaFolders';
import { listPublicVideos, getDirectHref } from '../../lib/ydiskPublic';

// Редирект на временную прямую ссылку Яндекс.Диска.
// Трафик идёт мимо нашего сервера: браузер сам качает/стримит с downloader.disk.yandex.ru,
// Range-запросы для перемотки обрабатывает Яндекс.
export const GET: APIRoute = async ({ url }) => {
  const shiftId = url.searchParams.get('shift') ?? '';
  const name = url.searchParams.get('name') ?? '';
  const folder = zashitaFolders[shiftId];
  if (!folder || !name) return new Response('Not found', { status: 404 });

  // Разрешаем только файлы, реально лежащие в этой папке, — путь из запроса не доверяем.
  const items = await listPublicVideos(folder.publicKey);
  const item = items.find((i) => i.name === name);
  if (!item) return new Response('Not found', { status: 404 });

  const href = await getDirectHref(folder.publicKey, item.path);
  if (!href) return new Response('Ссылка недоступна', { status: 502 });

  return new Response(null, {
    status: 302,
    headers: { Location: href, 'Cache-Control': 'no-store' },
  });
};
