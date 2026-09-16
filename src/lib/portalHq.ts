// src/lib/portalHq.ts
// Чтение Штаба (АйдаШтаб) для портала. Штаб живёт в тех же таблицах, что и
// Telegram-бот: decision_log — карточки решений, dialog_episodes — темы
// переписки. Портал не подменяет бота, а даёт то, чего лента не умеет:
// обзор, фильтры и массовые действия.
//
// Права aidacamp_app: SELECT на обе таблицы, UPDATE только на статусные поля.
// Содержимое карточек ведут генераторы — портал меняет решение, не текст.
import { query } from './db';

/** Состояния, в которых карточка ждёт решения. */
const OPEN = "('proposed','edited')";

export interface HqCard {
  id: number;
  kind: string;
  section: string | null;
  title: string;
  status: string;
  created_at: string;
  not_before: string | null;
  text: string | null;
  summary: string | null;
  /** Ждёт ли эта карточка именно владельца (в отличие от фоновой механики). */
  needs_you: boolean;
  /** Транспорт не подключён — исполнить нечем, копится зря. */
  blocked_reason: string | null;
}

// Что физически не может исполниться: карточки создаются, но применить их
// некуда. Их видно отдельно, чтобы не путать с очередью на решение.
const NO_TRANSPORT: Record<string, string> = {
  post: 'публикация в канал не настроена',
  ad_change: 'нет моста к Директу',
};

// Требуют человека: деньги, отправка наружу, необратимое, спорное.
const NEEDS_YOU = new Set([
  'staff_task', 'reply', 'outreach_reply', 'promise_due', 'follow_up', 'inbox_escalation',
]);

export const KIND_LABEL: Record<string, string> = {
  staff_task: 'Задача',
  reply: 'Ответ в переписке',
  outreach_reply: 'Ответ на рассылку',
  promise_due: 'Наше обещание',
  follow_up: 'Напомнить',
  inbox_escalation: 'Непонятное сообщение',
  post: 'Пост в канал',
  ad_change: 'Реклама',
  shift_day: 'План дня',
  digest: 'Сводка',
};

function decorate(r: any): HqCard {
  return {
    ...r,
    needs_you: NEEDS_YOU.has(r.kind),
    blocked_reason: NO_TRANSPORT[r.kind] ?? null,
  };
}

/** Открытые карточки. Свежие сверху — в очереди важнее последнее. */
export async function listCards(kind?: string): Promise<HqCard[]> {
  const rows = await query<any>(
    `SELECT id, kind, section, title, status, created_at, not_before,
            payload->>'text' AS text, payload->>'summary' AS summary
       FROM decision_log
      WHERE status IN ${OPEN}
        AND ($1::text IS NULL OR kind = $1)
      ORDER BY created_at DESC, id DESC`,
    [kind || null],
  );
  return (rows ?? []).map(decorate);
}

/** Недавно решённые — чтобы видеть, что происходило, без чтения ленты. */
export async function listRecentClosed(limit = 40): Promise<HqCard[]> {
  const rows = await query<any>(
    `SELECT id, kind, section, title, status, created_at, not_before,
            payload->>'text' AS text, left(coalesce(feedback,''), 200) AS summary
       FROM decision_log
      WHERE status NOT IN ${OPEN}
        AND COALESCE(answered_at, executed_at, created_at) > now() - interval '3 days'
      ORDER BY COALESCE(answered_at, executed_at, created_at) DESC
      LIMIT $1`,
    [limit],
  );
  return (rows ?? []).map(decorate);
}

export interface HqTask {
  id: number;
  title: string;
  state: string;
  reaction_note: string | null;
  due_raw: string | null;
  report: string | null;
  artifact_required: string | null;
  artifact_given: string | null;
  created_at: string;
}

/** Задачи с посчитанным состоянием (вью staff_task_state, миграции 013-015). */
export async function listTasks(): Promise<HqTask[]> {
  const rows = await query<HqTask>(
    `SELECT id, title, state, reaction_note, due_raw, report,
            artifact_required, artifact_given, created_at
       FROM staff_task_state
      ORDER BY array_position(
        ARRAY['overdue','not_sent','unclear','claimed','no_date','blocked','silent','planned','done'],
        state), due_at NULLS LAST, created_at DESC`,
  );
  return rows ?? [];
}

export interface HqEpisode {
  id: number;
  source: string;
  peer_id: string;
  peer_name: string | null;
  topic: string;
  summary: string | null;
  waiting: string | null;
  open_promise: string | null;
  promise_due: string | null;
  follow_up_at: string | null;
  last_msg_at: string;
  msg_count: number;
}

/**
 * Открытые темы переписки. `waiting='us'` — ход наш, это долг; `them` — ждём
 * ответа, показывать нечего. По умолчанию отдаём наш долг: с него начинают.
 */
export async function listEpisodes(waiting: 'us' | 'them' = 'us'): Promise<HqEpisode[]> {
  const rows = await query<HqEpisode>(
    `SELECT id, source, peer_id, peer_name, topic, summary, waiting,
            open_promise, promise_due::text, follow_up_at::text, last_msg_at, msg_count
       FROM dialog_episodes
      WHERE status='open' AND waiting=$1
      ORDER BY promise_due NULLS LAST, follow_up_at NULLS LAST, last_msg_at DESC`,
    [waiting],
  );
  return rows ?? [];
}

/** Счётчики для шапки — один запрос вместо пяти. */
export async function counts(): Promise<Record<string, number>> {
  const rows = await query<{ k: string; n: string }>(
    `SELECT kind AS k, count(*)::text AS n FROM decision_log
      WHERE status IN ${OPEN} GROUP BY kind`,
  );
  const out: Record<string, number> = {};
  let needsYou = 0, blocked = 0;
  for (const r of rows ?? []) {
    out[r.k] = Number(r.n);
    if (NEEDS_YOU.has(r.k)) needsYou += Number(r.n);
    else if (NO_TRANSPORT[r.k]) blocked += Number(r.n);
  }
  out._needs_you = needsYou;
  out._blocked = blocked;

  const ep = await query<{ waiting: string; n: string }>(
    `SELECT waiting, count(*)::text AS n FROM dialog_episodes
      WHERE status='open' GROUP BY waiting`,
  );
  for (const r of ep ?? []) out[`_ep_${r.waiting}`] = Number(r.n);
  return out;
}
