export const prerender = false;
import type { APIRoute } from 'astro';
import { unlink, readFile, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { readdirSync } from 'fs';

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { name } = await request.json() as { name?: string };
    if (!name || /[^a-z0-9_-]/i.test(name)) {
      return json({ error: 'Неверное имя файла' }, 400);
    }

    const galleryDir = join(process.cwd(), 'images', 'gallery');

    // Удаляем все варианты файла
    const targets = [
      join(galleryDir, `${name}.avif`),
      join(galleryDir, 'jpg', `${name}.jpg`),
      join(galleryDir, 'thumbs', `${name}.avif`),
    ];

    // Оригинал — любое расширение
    try {
      const originals = readdirSync(join(galleryDir, 'originals'));
      const origFile = originals.find(f => f.startsWith(name + '.') || f === name);
      if (origFile) targets.push(join(galleryDir, 'originals', origFile));
    } catch {}

    const deleted: string[] = [];
    for (const t of targets) {
      try { await unlink(t); deleted.push(t.split('/').pop()!); } catch {}
    }

    // Убираем из gallery-additions.json
    const additionsPath = join(galleryDir, 'gallery-additions.json');
    let removedFromAdditions = false;
    try {
      const additions: Record<string, { file: string; alt: string }[]> =
        JSON.parse(await readFile(additionsPath, 'utf-8'));
      let changed = false;
      for (const section of Object.keys(additions)) {
        const before = additions[section].length;
        additions[section] = additions[section].filter(e => e.file !== `${name}.avif`);
        if (additions[section].length < before) { changed = true; removedFromAdditions = true; }
      }
      if (changed) await writeFile(additionsPath, JSON.stringify(additions, null, 2));
    } catch {}

    return json({ ok: true, deleted, removedFromAdditions });
  } catch (err: any) {
    return json({ error: String(err?.message ?? err) }, 500);
  }
};

export const GET: APIRoute = () => json({ status: 'gallery-delete API ready' });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
