import { query, withDbClient } from './db';

export interface DraftPost {
  id: number;
  shift_id: number | null;
  author_telegram_id: number;
  status: 'collecting' | 'pending_review' | 'approved' | 'rejected';
  text: string | null;
  reviewer_chat_id: number | null;
  reviewer_message_id: number | null;
}

const SELECT = 'SELECT id, shift_id, author_telegram_id, status, text, reviewer_chat_id, reviewer_message_id FROM draft_post';

export async function getOrCreateCollectingDraft(authorTelegramId: number, shiftId: number | null): Promise<DraftPost> {
  const existing = await query<DraftPost>(
    `${SELECT} WHERE author_telegram_id=$1 AND status='collecting' ORDER BY created_at DESC LIMIT 1`,
    [authorTelegramId],
  );
  if (existing?.[0]) return existing[0];

  const created = await query<DraftPost>(
    `INSERT INTO draft_post (shift_id, author_telegram_id, status) VALUES ($1, $2, 'collecting') RETURNING id, shift_id, author_telegram_id, status, text, reviewer_chat_id, reviewer_message_id`,
    [shiftId, authorTelegramId],
  );
  return created![0];
}

export async function getDraft(id: number): Promise<DraftPost | null> {
  const rows = await query<DraftPost>(`${SELECT} WHERE id=$1`, [id]);
  return rows?.[0] ?? null;
}

export async function appendDraftText(id: number, extraText: string): Promise<void> {
  await withDbClient(async (c) => {
    const r = await c.query('SELECT text FROM draft_post WHERE id=$1', [id]);
    const current: string | null = r.rows[0]?.text ?? null;
    const next = current ? `${current} ${extraText}` : extraText;
    await c.query('UPDATE draft_post SET text=$1 WHERE id=$2', [next, id]);
  });
}

export async function setDraftText(id: number, text: string): Promise<void> {
  await query('UPDATE draft_post SET text=$1 WHERE id=$2', [text, id]);
}

export async function setDraftStatus(
  id: number,
  status: DraftPost['status'],
  decidedBy?: number,
): Promise<void> {
  if (status === 'approved' || status === 'rejected') {
    await query(
      'UPDATE draft_post SET status=$2, decided_by=$3, decided_at=now() WHERE id=$1',
      [id, status, decidedBy ?? null],
    );
  } else {
    await query('UPDATE draft_post SET status=$2 WHERE id=$1', [id, status]);
  }
}

export async function setReviewerMessage(id: number, chatId: number, messageId: number): Promise<void> {
  await query(
    'UPDATE draft_post SET reviewer_chat_id=$2, reviewer_message_id=$3 WHERE id=$1',
    [id, chatId, messageId],
  );
}
