/**
 * Комментарии к методичкам (per activity_slug), с версиями.
 * Версии формируются так: на каждое редактирование пишем новую строку,
 * parent_id = id предыдущей версии, version += 1.
 */
import { withDbClient } from './db';

export interface MethodichkaComment {
  id: number;
  activity_slug: string;
  author: string | null;
  author_name: string | null;
  body: string;
  source: 'text' | 'voice';
  version: number;
  parent_id: number | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/** Все активные комментарии по slug. */
export async function listComments(slug: string): Promise<MethodichkaComment[]> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `SELECT id, activity_slug, author, author_name, body, source, version, parent_id,
              archived,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS updated_at
         FROM portal_methodichka_comment
         WHERE activity_slug = $1 AND archived = FALSE
         ORDER BY created_at`,
      [slug]
    );
    return q.rows as MethodichkaComment[];
  });
  return r ?? [];
}

/** История версий по конкретному корню (рекурсивно по parent_id). */
export async function listHistory(rootId: number): Promise<MethodichkaComment[]> {
  const r = await withDbClient(async (c) => {
    const q = await c.query(
      `WITH RECURSIVE chain AS (
         SELECT * FROM portal_methodichka_comment WHERE id = $1
         UNION ALL
         SELECT pmc.* FROM portal_methodichka_comment pmc
         JOIN chain ON pmc.parent_id = chain.id
       )
       SELECT id, activity_slug, author, author_name, body, source, version, parent_id,
              archived,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
              to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS updated_at
         FROM chain
         ORDER BY version`,
      [rootId]
    );
    return q.rows as MethodichkaComment[];
  });
  return r ?? [];
}

/** Создать новый комментарий (корневой или новую версию). */
export async function createComment(p: {
  slug: string;
  body: string;
  source?: 'text' | 'voice';
  author: string | null;
  author_name: string | null;
  parent_id?: number | null;
}): Promise<number> {
  const r = await withDbClient(async (c) => {
    let version = 1;
    let parentId: number | null = p.parent_id ?? null;
    if (parentId) {
      // Архивируем все предыдущие в цепочке (показываем только последний)
      const q = await c.query(
        `SELECT version FROM portal_methodichka_comment WHERE id = $1`,
        [parentId]
      );
      version = (Number(q.rows[0]?.version) || 0) + 1;
      // Archive every older row in the same chain so listComments() shows only the head
      await c.query(
        `WITH RECURSIVE chain AS (
           SELECT id FROM portal_methodichka_comment WHERE id = $1
           UNION ALL
           SELECT pmc.id FROM portal_methodichka_comment pmc
           JOIN chain ON pmc.parent_id = chain.id
         )
         UPDATE portal_methodichka_comment SET archived = TRUE
         WHERE id IN (SELECT id FROM chain)`,
        [parentId]
      );
    }
    const ins = await c.query(
      `INSERT INTO portal_methodichka_comment (activity_slug, author, author_name, body, source, version, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [p.slug, p.author, p.author_name, p.body, p.source ?? 'text', version, parentId]
    );
    return Number(ins.rows[0].id);
  });
  return r ?? 0;
}

export async function archiveComment(id: number): Promise<void> {
  await withDbClient(async (c) => {
    await c.query(`UPDATE portal_methodichka_comment SET archived = TRUE WHERE id = $1`, [id]);
  });
}
