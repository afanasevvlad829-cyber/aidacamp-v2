export const prerender = false;
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const DATA_DIR = '/var/www/aidacamp-dev/clicks';

export const POST: APIRoute = async ({ request }) => {
  try {
    const events = await request.json();
    if (!Array.isArray(events) || events.length === 0) {
      return new Response('[]', { status: 200 });
    }

    // Ограничение: не более 50 событий за раз
    const batch = events.slice(0, 50);
    const date = new Date().toISOString().split('T')[0];

    await mkdir(DATA_DIR, { recursive: true });
    const lines = batch.map((e: any) => JSON.stringify({
      type: e.type,
      path: String(e.path || '').slice(0, 200),
      text: String(e.text || '').slice(0, 80),
      x: Number(e.x) || 0,
      y: Number(e.y) || 0,
      page: String(e.page || '/').slice(0, 100),
      ts: Number(e.ts) || Date.now(),
      vw: Number(e.vw) || 0,
      count: Number(e.count) || 1,
    })).join('\n') + '\n';

    await appendFile(join(DATA_DIR, `${date}.jsonl`), lines);

    return new Response('ok', { status: 200 });
  } catch {
    return new Response('err', { status: 500 });
  }
};
