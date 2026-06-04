#!/usr/bin/env node
/**
 * ingest-seo-reports.mjs — заливает SEO-отчёты Reports Hub в RAG (knowledge_chunks)
 *
 * Использование: node ingest-seo-reports.mjs [--clear-seo]
 * Env: OPENAI_API_KEY, DATABASE_URL
 *
 * Источник: /opt/reports-hub/files/*seo*.html
 * source-формат: report:seo:<filename>
 */

import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error('❌ OPENAI_API_KEY не задан'); process.exit(1); }

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const REPORTS_DIR = '/opt/reports-hub/files';
const CHUNK_SIZE  = 400;
const BATCH       = 100;
const MODEL       = 'text-embedding-3-small';

// ── HTML → текст (без зависимостей) ───────────────────────────
function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function chunkText(text, source) {
  const sentences = text.split(/(?<=[.!?»\n])\s+/).filter(s => s.trim().length > 15);
  const chunks = [];
  let buf = '';
  for (const sent of sentences) {
    if ((buf + ' ' + sent).length > CHUNK_SIZE && buf) {
      chunks.push({ source, text: buf.trim() });
      buf = sent;
    } else {
      buf = buf ? buf + ' ' + sent : sent;
    }
  }
  if (buf.trim()) chunks.push({ source, text: buf.trim() });
  return chunks;
}

async function embed(texts) {
  const resp = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: texts, model: MODEL }),
  });
  const data = await resp.json();
  if (!data.data) throw new Error('OpenAI: ' + JSON.stringify(data).slice(0, 200));
  return data.data.map(d => d.embedding);
}

async function insertBatch(chunks, embeddings) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < chunks.length; i++) {
      await client.query(
        'INSERT INTO knowledge_chunks (source, text, embedding) VALUES ($1, $2, $3::vector)',
        [chunks[i].source, chunks[i].text, '[' + embeddings[i].join(',') + ']']
      );
    }
    await client.query('COMMIT');
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
}

async function main() {
  if (process.argv.includes('--clear-seo')) {
    await pool.query("DELETE FROM knowledge_chunks WHERE source LIKE 'report:seo:%'");
    console.log('Очищены старые report:seo:* чанки');
  }

  const existing = new Set(
    (await pool.query("SELECT DISTINCT source FROM knowledge_chunks WHERE source LIKE 'report:seo:%'")).rows.map(r => r.source)
  );

  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => /seo/i.test(f) && f.endsWith('.html'));

  console.log(`Найдено ${files.length} SEO-отчётов`);
  let totalChunks = 0;

  for (const file of files) {
    const source = `report:seo:${file.replace('.html', '')}`;
    if (existing.has(source)) { console.log(`  ↩ ${file} — уже в базе`); continue; }

    const html = fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8');
    const text = htmlToText(html);
    if (text.length < 200) { console.log(`  ⚠ ${file} — мало текста (${text.length})`); continue; }

    const chunks = chunkText(text, source);
    // Эмбеддим батчами
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embeddings = await embed(slice.map(c => c.text));
      await insertBatch(slice, embeddings);
    }
    totalChunks += chunks.length;
    console.log(`  ✅ ${file} → ${chunks.length} чанков`);
  }

  console.log(`\nГотово: ${totalChunks} чанков из ${files.length} отчётов`);
  await pool.end();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
