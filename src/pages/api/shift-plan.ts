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
import { STAFF_COOKIE, getStaffSecret, isStaffAuthed } from '../../lib/staffAuth';

const DATA_FILE = process.env.SHIFT_PLAN_FILE || '/var/lib/aidacamp/shift-plan.json';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

/**
 * Гейт авторизации. Fail-closed: нет STAFF_AUTH_SECRET → 503 (не фолбэк на '2026').
 * Возвращает Response при отказе, либо null если авторизация пройдена.
 */
function authGate(cookies: Parameters<APIRoute>[0]['cookies']): Response | null {
  const secret = getStaffSecret();
  if (!secret) return json({ ok: false, error: 'Service Unavailable' }, 503);
  if (!isStaffAuthed(cookies.get(STAFF_COOKIE)?.value, secret)) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }
  return null;
}

export const GET: APIRoute = async ({ cookies }) => {
  const denied = authGate(cookies);
  if (denied) return denied;
  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    return json({ ok: true, plan: JSON.parse(raw) });
  } catch {
    // Файла ещё нет — клиент использует встроенный SEED-план.
    return json({ ok: true, plan: null });
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const denied = authGate(cookies);
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
    // Раньше отдавали 200 → ошибка записи молча терялась. Теперь 500, чтобы сбой был виден.
    return json({ ok: false, error: String(e) }, 500);
  }
};
