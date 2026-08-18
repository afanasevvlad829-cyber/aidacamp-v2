export const prerender = false;
import type { APIRoute } from 'astro';
import { getPool } from '../../../lib/db';
import { readVisitorId } from '../../../lib/attribution/cookie';

export const POST: APIRoute = async ({ request }) => {
  let body: { discount?: number; shiftId?: string; ymClientId?: string } = {};
  try { body = await request.json(); } catch { /* ignore */ }

  const discount = typeof body.discount === 'number' ? body.discount : null;
  const shiftId  = typeof body.shiftId  === 'string' ? body.shiftId  : 'shift-1';
  const ip       = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
  const ua       = request.headers.get('user-agent') ?? null;
  // aid_visitor ставит nginx (HttpOnly) — по нему событие колеса связывается
  // с таблицей visits, где лежат UTM, yclid и источник визита.
  const visitorId = readVisitorId(request);
  const ymClientId = typeof body.ymClientId === 'string' ? body.ymClientId : null;

  let logged = true;
  try {
    await getPool()?.query(
      `INSERT INTO fortune_events (event_type, discount, shift_id, ip, user_agent, visitor_id, ym_client_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['spin', discount, shiftId, ip, ua, visitorId, ymClientId]
    );
  } catch (e: any) {
    logged = false;
    // Раньше ошибка молча глоталась, и запись не работала 40 дней (20.06–30.07.2026):
    // у роли aidacamp_app не было прав на fortune_events, а эндпоинт отвечал ok:true.
    // Теперь факт потери виден и в логе, и в ответе — мониторинг сможет его поймать.
    console.error('[fortune/spin] DB WRITE FAILED (событие потеряно):', e.message);
  }

  // Пользователю всё равно ok: колесо не должно ломаться из-за проблем логирования.
  return new Response(JSON.stringify({ ok: true, logged }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
