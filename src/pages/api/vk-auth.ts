export const prerender = false;
import type { APIRoute } from 'astro';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const CONFIG_PATH = '/var/www/aidacamp-dev/vk-config.json';
const CONFIG_PATH_LOCAL = join(process.cwd(), 'vk-config.json');

// --- helpers ----------------------------------------------------------------

async function readConfig(): Promise<Record<string, string>> {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try {
      const raw = await readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch { /* skip */ }
  }
  return {};
}

async function saveConfig(cfg: Record<string, string>): Promise<void> {
  const path = CONFIG_PATH_LOCAL;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cfg, null, 2), 'utf8');
}

// --- GET: получить текущий конфиг -------------------------------------------------------

export const GET: APIRoute = async () => {
  try {
    const cfg = await readConfig();
    const token = cfg.token ?? import.meta.env.VK_TOKEN ?? '';
    const userId = cfg.userId ?? import.meta.env.VK_USER_ID ?? '';

    return new Response(
      JSON.stringify({
        ok: true,
        configured: !!token && !!userId,
        userId: userId ? parseInt(userId) : null,
      }),
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};

// --- POST: сохранить токен и user_id -------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { token, userId } = body;

    if (!token?.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'VK токен обязателен' }),
        { status: 400 }
      );
    }

    if (!userId || isNaN(parseInt(userId))) {
      return new Response(
        JSON.stringify({ ok: false, error: 'ID пользователя обязателен и должен быть числом' }),
        { status: 400 }
      );
    }

    const cfg = await readConfig();
    cfg.token = token.trim();
    cfg.userId = String(userId).trim();

    await saveConfig(cfg);

    return new Response(
      JSON.stringify({ ok: true, message: 'Конфиг VK сохранён' }),
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};
