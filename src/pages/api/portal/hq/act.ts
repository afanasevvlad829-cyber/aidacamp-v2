export const prerender = false;
import type { APIRoute } from 'astro';
import { requireRole } from '../../../../lib/portalPerms';
import { query } from '../../../../lib/db';

/**
 * Решение по карточке Штаба из портала.
 *
 * Портал не подменяет Telegram-бота: там решают на ходу одним тапом, здесь —
 * когда сели разобрать очередь. Поэтому набор действий сознательно узкий:
 * отклонить и закрыть. Одобрение с отправкой наружу остаётся в боте, где у
 * каждой карточки свои кнопки и свой исполнитель — дублировать эту механику
 * в вебе значит развести два пути к одному внешнему вызову.
 *
 * Права: только admin и руководитель — это очередь владельца, не сотрудника.
 */
type Action = 'decline' | 'close';

const ACTIONS: Record<Action, { status: string; note: string }> = {
  decline: { status: 'declined', note: 'отклонено из портала' },
  close:   { status: 'expired',  note: 'снято из портала' },
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = requireRole(locals, ['admin', 'rukovoditel']);
  if (auth instanceof Response) return auth;

  let body: { ids?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'bad_json' }, 400);
  }

  const action = String(body.action || '') as Action;
  if (!(action in ACTIONS)) return json({ ok: false, error: 'bad_action' }, 400);

  // Массовое действие — главное, ради чего портал и нужен: в ленте бота
  // шестнадцать однотипных карточек закрываются по одной.
  const ids = Array.isArray(body.ids)
    ? body.ids.map(Number).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  if (!ids.length) return json({ ok: false, error: 'no_ids' }, 400);
  if (ids.length > 200) return json({ ok: false, error: 'too_many' }, 400);

  const { status, note } = ACTIONS[action];
  const rows = await query<{ id: number }>(
    `UPDATE decision_log
        SET status = $1, answered_at = now(),
            feedback = COALESCE(feedback, '') || $2
      WHERE id = ANY($3::int[])
        AND status IN ('proposed', 'edited')
      RETURNING id`,
    [status, `\n[портал] ${note}`, ids],
  );

  return json({ ok: true, changed: rows?.length ?? 0 });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
