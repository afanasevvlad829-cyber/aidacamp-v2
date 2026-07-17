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
 *
 * Авторизация: /staff/* использует отдельный от /portal общий пароль
 * (см. src/scripts/pages/staff-index.ts) — cookie staff_auth_2026 хранит сам пароль,
 * сервер сверяет его с STAFF_ACCESS_PASSWORD. Без этой переменной endpoint fail-closed (503).
 */
import type { APIRoute } from 'astro';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const DATA_FILE = process.env.SHIFT_PLAN_FILE || '/var/lib/aidacamp/shift-plan.json';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function checkStaffAuth(request: Request): Response | null {
  const expected = process.env.STAFF_ACCESS_PASSWORD;
  if (!expected) return json({ ok: false, error: 'service unavailable' }, 503);
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)staff_auth_2026=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : '';
  if (value !== expected) return json({ ok: false, error: 'unauthorized' }, 401);
  return null;
}

export const GET: APIRoute = async ({ request }) => {
  const denied = checkStaffAuth(request);
  if (denied) return denied;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    return json({ ok: true, plan: JSON.parse(raw) });
  } catch {
    // Файла ещё нет — клиент использует встроенный SEED-план.
    return json({ ok: true, plan: null });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const denied = checkStaffAuth(request);
  if (denied) return denied;
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
