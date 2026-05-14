export const prerender = false;
import type { APIRoute } from 'astro';
import { readFileSync } from 'fs';
import { join } from 'path';
import { images } from '../../data/gallery';

export const GET: APIRoute = ({ url }) => {
  const section = url.searchParams.get('section') ?? '';
  if (!section) {
    return new Response(JSON.stringify({ error: 'section required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const galleryDir = join(process.cwd(), 'images', 'gallery');
  type Addition = { file: string; alt: string };
  let additions: Record<string, Addition[]> = {};
  try {
    additions = JSON.parse(readFileSync(join(galleryDir, 'gallery-additions.json'), 'utf-8'));
  } catch {}

  const base = (images[section] ?? []);
  const extra = (additions[section] ?? []).map(e => ({
    src: `/images/gallery/${e.file}`,
    alt: e.alt || '',
  }));

  const photos = [...base, ...extra];
  return new Response(JSON.stringify(photos), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public,max-age=60' },
  });
};
