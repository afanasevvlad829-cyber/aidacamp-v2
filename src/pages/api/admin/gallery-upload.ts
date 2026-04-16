export const prerender = false;
import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join, extname } from 'path';

const execFileAsync = promisify(execFile);

// Все допустимые имена (без расширения)
const ALLOWED = new Set([
  'IMG_7209','IMG_7212','IMG_7219',
  'camp-group-beanbags','camp-smile','camp-two-beanbags',
  'food-buffet','food-kids-peace','food-tray',
  'gallery-01','gallery-03','gallery-04','gallery-05','gallery-06',
  'gallery-08','gallery-10','gallery-11','gallery-12',
  'hackathon-present',
  'pool-interior','pool-kids-edge','pool-noodles',
  'sport-ball','sport-field','sport-football','sport-goal','sport-volleyball',
  'study-coding','study-dome-group','study-dome-row','study-pitch','study-stage-girl',
  'territory-admin','territory-alley','territory-korpus',
]);

// HDR-фильтр: насыщенность +30%, S-контраст, поднять тени, sharpening
const HDR_ARGS = [
  '-modulate', '103,130,100',
  '-sigmoidal-contrast', '4,50%',
  '-level', '3%,97%',
  '-unsharp', '0x0.5+0.8+0.02',
];

export const GET: APIRoute = () => json({ status: 'gallery-upload API ready' });

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = (formData.get('name') as string | null)?.trim();

    if (!file || !name) {
      return json({ error: 'Нет файла или имени' }, 400);
    }
    if (!ALLOWED.has(name)) {
      return json({ error: `Неизвестное имя: ${name}` }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Определяем расширение оригинала
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

    // 1. Сохраняем оригинал (нетронутый)
    const origOut = join(originalsDir, `${name}${origExt}`);
    await writeFile(origOut, buffer);

    // HEIC/HEIF с iPhone содержит depth-map и другие слои — берём только [0]
    const isHeic = /\.(heic|heif)$/i.test(origExt);
    const tmpIn = isHeic ? `${tmp}[0]` : tmp;

    // 2. HDR → AVIF (основной формат)
    const outAvif  = join(galleryDir, `${name}.avif`);
    await execFileAsync('convert', [tmpIn, ...HDR_ARGS, outAvif]);

    // 3. HDR → JPEG (фоллбэк)
    const outJpg = join(jpgDir, `${name}.jpg`);
    await execFileAsync('convert', [tmpIn, ...HDR_ARGS, '-quality', '90', outJpg]);

    // 4. Thumb из готового AVIF (400px)
    const outThumb = join(thumbsDir, `${name}.avif`);
    await execFileAsync('convert', [outAvif, '-resize', '400x', '-quality', '75', outThumb]);

    // Удаляем temp
    await execFileAsync('rm', ['-f', tmp]);

    return json({ ok: true, name, avif: outAvif, jpg: outJpg, original: origOut });
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
