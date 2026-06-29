export const prerender = false;
import type { APIRoute } from 'astro';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const POST: APIRoute = async ({ request }) => {
  const { section, positions } = await request.json() as {
    section: string;
    positions: Record<string, string>; // filename → position e.g. "50% 30%"
  };

  if (!section || !positions) {
    return new Response(JSON.stringify({ error: 'section and positions required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jsonPath = join(process.cwd(), 'images', 'gallery', 'gallery-additions.json');
  let data: Record<string, { file: string; alt: string; position?: string }[]> = {};
  try {
    data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch {
    return new Response(JSON.stringify({ error: 'cannot read gallery-additions.json' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!data[section]) {
    return new Response(JSON.stringify({ error: `section "${section}" not found` }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Применяем позиции к каждой фотке в секции
  data[section] = data[section].map(photo => {
    const pos = positions[photo.file];
    if (pos !== undefined) {
      return { ...photo, position: pos };
    }
    return photo;
  });

  writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8');
  return new Response(JSON.stringify({ ok: true, updated: Object.keys(positions).length }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
