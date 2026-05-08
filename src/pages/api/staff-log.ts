export const prerender = false;
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const LOG_DIR = '/var/log/aidacamp';
const LOG_FILE = join(LOG_DIR, 'staff-checklist.log');

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const ts = new Date().toISOString();
    const line = JSON.stringify({
      ts,
      role: body.role ?? null,
      day: body.day ?? null,
      taskIndex: body.taskIndex ?? null,
      task: typeof body.task === 'string' ? body.task.slice(0, 200) : null,
      action: body.action ?? null,
    }) + '\n';

    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
    console.log('[staff-checklist]', line.trim());

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // Never block the UI
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }
};
