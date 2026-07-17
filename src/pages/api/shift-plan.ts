export const prerender = false;
/**
 * /api/shift-plan — общее файловое хранилище плана смены (конструктор /staff/plan).
 *
 * GET  → { ok, plan }  — сохранённый план или null (клиент подставит SEED-план).
 * POST → { ok }        — перезаписывает план целиком (последняя запись побеждает).
 *
 * Хранилище: один JSON-файл на сервере (паттерн как у staff-log.ts).
 * Общий для всех ролей → разные люди заполняют один план.
 * Путь конфигурируется через SHIFT_PLAN_FILE, по умолчанию /var/lib/aidacamp/shift-plan.json.
 */
import type { APIRoute } from 'astro';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DATA_FILE   = process.env.SHIFT_PLAN_FILE    || '/var/lib/aidacamp/shift-plan.json';
const STAFF_AUTH  = process.env.STAFF_AUTH_SECRET  || '2026';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  if (cookies.get('staff_auth_2026')?.value !== STAFF_AUTH) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    return json({ ok: true, plan: JSON.parse(raw) });
  } catch {
    // Файла ещё нет — клиент использует встроенный SEED-план.
    return json({ ok: true, plan: null });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (cookies.get('staff_auth_2026')?.value !== STAFF_AUTH) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  try {
    const body = await request.json();
    // Принимаем И старый одиночный план (есть .days), И коллекцию смен (есть .shifts)
    const valid = body && typeof body === 'object' &&
      (Array.isArray((body as any).days) || Array.isArray((body as any).shifts));
    if (!valid) {
      return json({ ok: false, error: 'invalid plan' }, 400);
    }
    await mkdir(dirname(DATA_FILE), { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(body), 'utf8');
    return json({ ok: true, savedAt: new Date().toISOString() });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
};
