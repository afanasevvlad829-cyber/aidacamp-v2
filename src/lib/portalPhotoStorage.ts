/**
 * portalPhotoStorage.ts — сохранение загруженного фото/видео на диск.
 * Вынесено из api/portal/photo.ts (Codex-ревью 2026-07-10, находка №6):
 * handler был monolith на ~150 строк (auth + DB lookup + sharp + ffprobe +
 * запись файлов + INSERT в одном месте), плюс видео писалось на диск дважды
 * (tmp-файл под probe → rename → повторный writeFile «на всякий случай»).
 * Здесь — только сохранение файла, пишем один раз.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SavedFile {
  fileName: string;
  relPath: string;
  fileUrl: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  size_bytes: number;
}

async function probeVideoDuration(filePath: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath,
    ], { timeout: 5000 });
    const secs = parseFloat(stdout.trim());
    return isNaN(secs) ? null : Math.round(secs * 1000);
  } catch {
    return null;
  }
}

interface SaveParams {
  buffer: Buffer;
  uuid: string;
  relDir: string;
  absDir: string;
  urlPrefix: string;
}

/** Пережимает в JPEG (макс. сторона 1600px, quality 85), пишет на диск один раз. */
export async function saveUploadedPhoto(p: SaveParams): Promise<SavedFile> {
  await mkdir(p.absDir, { recursive: true });

  let finalBuffer: Buffer = p.buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    const sharp = (await import('sharp')).default;
    const sharpInstance = sharp(p.buffer).rotate(); // auto-orient
    const meta = await sharpInstance.metadata();
    const maxSide = 1600;
    let resizer = sharpInstance;
    if ((meta.width ?? 0) > maxSide || (meta.height ?? 0) > maxSide) {
      resizer = sharpInstance.resize(maxSide, maxSide, { fit: 'inside', withoutEnlargement: true });
    }
    const jpegBuf = await resizer.jpeg({ quality: 85 }).toBuffer({ resolveWithObject: true });
    finalBuffer = jpegBuf.data as Buffer;
    width = jpegBuf.info.width;
    height = jpegBuf.info.height;
  } catch {
    // sharp failed — save original bytes, no dimensions
  }

  const fileName = `${p.uuid}.jpg`;
  await writeFile(join(p.absDir, fileName), finalBuffer);

  const relPath = `${p.relDir}/${fileName}`;
  return {
    fileName,
    relPath,
    fileUrl: `${p.urlPrefix}/${relPath}`,
    width,
    height,
    duration_ms: null,
    size_bytes: finalBuffer.byteLength,
  };
}

/** Пишет видео на диск один раз, затем пробует ffprobe по уже записанному файлу. */
export async function saveUploadedVideo(p: SaveParams & { ext: string }): Promise<SavedFile> {
  await mkdir(p.absDir, { recursive: true });

  const fileName = `${p.uuid}.${p.ext}`;
  const absPath = join(p.absDir, fileName);
  await writeFile(absPath, p.buffer);
  const duration_ms = await probeVideoDuration(absPath);

  const relPath = `${p.relDir}/${fileName}`;
  return {
    fileName,
    relPath,
    fileUrl: `${p.urlPrefix}/${relPath}`,
    width: null,
    height: null,
    duration_ms,
    size_bytes: p.buffer.byteLength,
  };
}
