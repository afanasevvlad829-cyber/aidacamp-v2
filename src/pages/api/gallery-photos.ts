export const prerender = false;
import type { APIRoute } from 'astro';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { images } from '../../data/gallery';

// Прод/dev: nginx отдаёт /images/gallery/ через alias на /var/www/aidacamp-gallery/
// (отдельное хранилище галерей смен, см. CLAUDE.md → «Медиа и файлы»). SSR-процесс
// живёт в /var/www/aidacamp{,-dev}/current — там gallery-additions.json больше нет.
const SHARED_GALLERY_DIR = '/var/www/aidacamp-gallery';

export const GET: APIRoute = ({ url }) => {
  const section = url.searchParams.get('section') ?? '';
  if (!section) {
    return new Response(JSON.stringify({ error: 'section required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const galleryDir = existsSync(SHARED_GALLERY_DIR) ? SHARED_GALLERY_DIR : join(process.cwd(), 'images', 'gallery');
  type Addition = { file: string; alt: string; position?: string };
  let additions: Record<string, Addition[]> = {};
  try {
    additions = JSON.parse(readFileSync(join(galleryDir, 'gallery-additions.json'), 'utf-8'));
  } catch {}

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
