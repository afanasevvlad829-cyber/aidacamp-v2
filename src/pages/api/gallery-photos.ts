export const prerender = false;
import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';
import { images } from '../../data/gallery';

type Addition = { file: string; alt: string; position?: string };

// Манифест gallery-additions.json лежит в ОТДЕЛЬНОМ хранилище галереи
// /var/www/aidacamp-gallery (симлинк current/images/gallery → туда). Деплой иногда
// затирает симлинк реальной папкой из репо (без манифеста) → API отдаёт [] и все
// галереи пустеют (инцидент 03.07.2026, раздел /foto/). Поэтому читаем по абсолютному
// пути, устойчиво к симлинку: env GALLERY_DIR → известный прод-путь → cwd/images/gallery
// (последнее — для локальной разработки, где хранилища на сервере нет).
const MANIFEST_DIRS: string[] = [
  process.env.GALLERY_DIR,
  '/var/www/aidacamp-gallery',
  join(process.cwd(), 'images', 'gallery'),
].filter((d): d is string => Boolean(d));

function readManifest(): Record<string, Addition[]> {
  for (const dir of MANIFEST_DIRS) {
    try {
      return JSON.parse(readFileSync(join(dir, 'gallery-additions.json'), 'utf-8'));
    } catch {
      // нет файла/не читается в этом каталоге — пробуем следующий кандидат
    }
  }
  return {};
}

export const GET: APIRoute = ({ url }) => {
  const section = url.searchParams.get('section') ?? '';
  if (!section) {
    return new Response(JSON.stringify({ error: 'section required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const additions = readManifest();

  const base = (images[section] ?? []);
  const extra = (additions[section] ?? []).map(e => ({
    src: `/images/gallery/${e.file}`,
    alt: e.alt || '',
    file: e.file,
    ...(e.position ? { position: e.position } : {}),
  }));

  const photos = [...base, ...extra];
  return new Response(JSON.stringify(photos), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public,max-age=60' },
  });
};
