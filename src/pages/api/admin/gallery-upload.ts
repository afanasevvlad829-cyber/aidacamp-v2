import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

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
    const tmp = `/tmp/gallery-up-${Date.now()}-${name}`;
    await writeFile(tmp, buffer);

    // Пути на сервере (static-папка совпадает с cwd)
    const cwd = process.cwd();
    const galleryDir = join(cwd, 'images', 'gallery');
    const thumbsDir  = join(galleryDir, 'thumbs');
    await mkdir(thumbsDir, { recursive: true });

    const outFull  = join(galleryDir, `${name}.avif`);
    const outThumb = join(thumbsDir,  `${name}.avif`);

    // convert (IM6) → cinematic filter → AVIF
    await execFileAsync('convert', [
      tmp,
      '-modulate', '102,118,100',        // яркость, насыщенность, оттенок
      '-sigmoidal-contrast', '2.5,50%',  // S-кривая контраста
      '-unsharp', '0x0.4+0.6+0.02',      // лёгкий sharpening
      outFull,
    ]);

    // thumb 400px wide
    await execFileAsync('convert', [
      outFull,
      '-resize', '400x',
      '-quality', '75',
      outThumb,
    ]);

    // Удаляем temp
    await execFileAsync('rm', ['-f', tmp]);

    return json({ ok: true, name, full: outFull, thumb: outThumb });
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
