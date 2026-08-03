export const prerender = false;
import type { APIRoute } from 'astro';
import { ZipArchive } from 'archiver';
import { requireStaff } from '../../../lib/portalPerms';
import { getContentItem, readOriginal } from '../../../lib/portalShiftContent';

export const GET: APIRoute = async ({ locals, url }) => {
  const auth = requireStaff(locals);
  if (auth instanceof Response) return auth;

  const idsParam = url.searchParams.get('ids') || '';
  const ids = idsParam
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (!ids.length) return new Response('ids required', { status: 400 });
  if (ids.length > 300) return new Response('too many ids (max 300)', { status: 400 });

  const day = url.searchParams.get('day') || 'N';

  const files: Array<{ buf: Buffer; name: string }> = [];
  const nameSeen = new Map<string, number>();

  for (const id of ids) {
    const item = await getContentItem(id);
    if (!item || item.kind === 'voice') continue;
    const orig = await readOriginal(item);
    if (!orig) continue;

    let name = orig.name;
    const seen = nameSeen.get(orig.name) ?? 0;
    if (seen > 0) {
      const dot = name.lastIndexOf('.');
      name = dot >= 0 ? `${name.slice(0, dot)}_${id}${name.slice(dot)}` : `${name}_${id}`;
    }
    nameSeen.set(orig.name, seen + 1);
    files.push({ buf: orig.buf, name });
  }

  if (!files.length) return new Response('no files found', { status: 404 });

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on('data', (chunk: Buffer) => chunks.push(chunk));

  await new Promise<void>((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);
    for (const { buf, name } of files) {
      archive.append(buf, { name });
    }
    archive.finalize();
  });

  const zipBuf = Buffer.concat(chunks);
  const ts = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  const filename = `день-${day}_${ts}.zip`;

  return new Response(new Uint8Array(zipBuf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(zipBuf.length),
      'Cache-Control': 'no-store',
    },
  });
};
