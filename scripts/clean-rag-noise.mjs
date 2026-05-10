#!/usr/bin/env node
/**
 * clean-rag-noise.mjs — удаляет нерелевантные источники из knowledge_chunks.
 *
 * Что удаляем:
 *   - claude_session:*      — технические диалоги Claude (~691 чанков)
 *   - obsidian:АйДаКемп/Сессии/*    — внутренние маркетинг-сессии
 *   - obsidian:АйДаКемп/Маркетинг/* — внутренние документы по рекламе/SEO
 *   - obsidian:Библиотека знаний/*  — справочники для агентов (не для родителей)
 *   - obsidian:MCP*                  — техническая документация
 *   - obsidian:UIAudit/*             — внутренние UI-аудиты
 *
 * Эти чанки не используются как top-1 для родительских вопросов
 * (по данным RAGAS), но шумят в cosine-поиске и дают побочные галлюцинации.
 *
 * Запуск:
 *   DATABASE_URL=... node scripts/clean-rag-noise.mjs           # удалить
 *   DATABASE_URL=... node scripts/clean-rag-noise.mjs --dry     # только показать
 */

import pg from 'pg';

const DRY = process.argv.includes('--dry');
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const PATTERNS = [
  ["claude_session:%",                       "claude_session"],
  ["obsidian:АйДаКемп/Сессии/%",             "obsidian-Сессии"],
  ["obsidian:АйДаКемп/Маркетинг/%",          "obsidian-Маркетинг"],
  ["obsidian:Библиотека знаний/%",           "obsidian-Библиотека"],
  ["obsidian:MCP%",                          "obsidian-MCP"],
  ["obsidian:UIAudit/%",                     "obsidian-UIAudit"],
];

async function main() {
  console.log(DRY ? '⚠️  DRY RUN' : '🧹 Чистка RAG-мусора');
  console.log('');

  let totalToDelete = 0;
  for (const [pattern, label] of PATTERNS) {
    const { rows } = await pool.query(
      'SELECT COUNT(*) as cnt FROM knowledge_chunks WHERE source LIKE $1',
      [pattern]
    );
    const cnt = Number(rows[0].cnt);
    totalToDelete += cnt;
    console.log(`  ${label.padEnd(20)} ${String(cnt).padStart(5)} чанков`);
  }
  console.log(`  ${'ИТОГО'.padEnd(20)} ${String(totalToDelete).padStart(5)} чанков\n`);

  if (DRY) {
    console.log('DRY mode — ничего не удаляем.');
    await pool.end();
    return;
  }

  const { rows: before } = await pool.query('SELECT COUNT(*) FROM knowledge_chunks');
  console.log(`До удаления: ${before[0].count} чанков всего`);

  let deleted = 0;
  for (const [pattern] of PATTERNS) {
    const r = await pool.query(
      'DELETE FROM knowledge_chunks WHERE source LIKE $1',
      [pattern]
    );
    deleted += r.rowCount;
  }

  const { rows: after } = await pool.query('SELECT COUNT(*) FROM knowledge_chunks');
  console.log(`После удаления: ${after[0].count} чанков (-${deleted})`);
  console.log('\n✅ Готово.');
  await pool.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
