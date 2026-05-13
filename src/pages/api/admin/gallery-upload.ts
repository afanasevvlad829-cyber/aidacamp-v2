export const prerender = false;
import type { APIRoute } from 'astro';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, extname } from 'path';

const execFileAsync = promisify(execFile);

// No filters. Strip ICC profile, force sRGB — just clean format conversion.
const CONVERT_ARGS = [
  '-strip',
  '-colorspace', 'sRGB',
  '-colorspace', 'sRGB',  // re-apply after strip
];

export const GET: APIRoute = () => json({ status: 'gallery-upload API ready' });

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    let name = (formData.get('name') as string | null)?.trim() ?? '';
    const section = (formData.get('section') as string | null)?.trim() ?? '';

    if (!file) {
      return json({ error: 'Нет файла' }, 400);
    }

    // Sanitize / auto-generate name
    if (name) {
      name = name.replace(/[^a-z0-9_-]/gi, '-').replace(/-+/g, '-').toLowerCase();
    }
    if (!name) {
      if (!section) return json({ error: 'Нужно имя файла или раздел' }, 400);
      name = `${section}-${Date.now().toString(36)}`;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const origExt = extname(file.name || '.jpg') || '.jpg';
    const tmp = `/tmp/gallery-up-${Date.now()}-${name}${origExt}`;
    await writeFile(tmp, buffer);

    const cwd = process.cwd();
    const galleryDir   = join(cwd, 'images', 'gallery');
    const originalsDir = join(galleryDir, 'originals');
    const thumbsDir    = join(galleryDir, 'thumbs');
    const jpgDir       = join(galleryDir, 'jpg');

    await mkdir(originalsDir, { recursive: true });
    await mkdir(thumbsDir,    { recursive: true });
    await mkdir(jpgDir,       { recursive: true });

    // 1. Save original (untouched)
    const origOut = join(originalsDir, `${name}${origExt}`);
    await writeFile(origOut, buffer);

    // HEIC/HEIF from iPhone has depth layers — take only [0]
    const isHeic = /\.(heic|heif)$/i.test(origExt);
    const tmpIn = isHeic ? `${tmp}[0]` : tmp;

    // 2. HDR → AVIF (main format)
    const outAvif  = join(galleryDir, `${name}.avif`);
    await execFileAsync('convert', [tmpIn, ...CONVERT_ARGS, outAvif]);

    // 3. HDR → JPEG (fallback for browsers)
    const outJpg = join(jpgDir, `${name}.jpg`);
    await execFileAsync('convert', [tmpIn, ...CONVERT_ARGS, '-quality', '90', outJpg]);

    // 4. Thumb from AVIF (400px wide)
    const outThumb = join(thumbsDir, `${name}.avif`);
    await execFileAsync('convert', [outAvif, '-resize', '400x', '-quality', '75', outThumb]);

    // Cleanup temp
    await execFileAsync('rm', ['-f', tmp]);

    // If this is a NEW photo (section provided) — persist to gallery-additions.json
    if (section) {
      const additionsPath = join(galleryDir, 'gallery-additions.json');
      let additions: Record<string, { file: string; alt: string }[]> = {};
      try {
        additions = JSON.parse(await readFile(additionsPath, 'utf-8'));
      } catch {}
      if (!additions[section]) additions[section] = [];
      // Avoid duplicates
      if (!additions[section].some(e => e.file === `${name}.avif`)) {
        additions[section].push({ file: `${name}.avif`, alt: '' });
      }
      await writeFile(additionsPath, JSON.stringify(additions, null, 2));
    }

    return json({ ok: true, name, file: `${name}.avif`, avif: outAvif, jpg: outJpg });
  } catch (err: any) {
    console.error('gallery-upload error:', err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
