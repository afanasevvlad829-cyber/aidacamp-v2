#!/usr/bin/env node
/**
 * ingest-knowledge.mjs — загружает контент в PostgreSQL + pgvector
 *
 * Использование:
 *   node scripts/ingest-knowledge.mjs /path/to/file.docx [file2.docx ...]
 *   node scripts/ingest-knowledge.mjs /path/to/folder/
 *   node scripts/ingest-knowledge.mjs --clear   # очистить всю базу
 *
 * Env:
 *   OPENAI_API_KEY  — ключ OpenAI (обязательно)
 *   DATABASE_URL    — postgres URL (по умолчанию: aidacamp@localhost)
 *
 * Источник пропускается если уже есть в БД (инкрементальная загрузка).
 */

import mammoth from 'mammoth';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import pg from 'pg';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) { console.error('❌  OPENAI_API_KEY не задан'); process.exit(1); }

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const CHUNK_SIZE    = 400;  // символов на чанк
const CHUNK_OVERLAP = 80;
const BATCH         = 100; // чанков за запрос (OpenAI поддерживает до 2048)
const DELAY_MS      = 500; // 0.5с между батчами (OpenAI имеет высокие лимиты)

// ── PostgreSQL ────────────────────────────────────────────────────────────────

async function dbInsertBatch(chunks, embeddings) {
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
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function dbGetSources() {
  const { rows } = await pool.query('SELECT DISTINCT source FROM knowledge_chunks');
  return new Set(rows.map(r => r.source));
}

async function dbCount() {
  const { rows } = await pool.query('SELECT COUNT(*) as n FROM knowledge_chunks');
  return rows[0].n;
}

async function dbClear() {
  await pool.query('TRUNCATE knowledge_chunks RESTART IDENTITY');
}

// ── helpers ───────────────────────────────────────────────────────────────────

function chunkText(text, source) {
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.!?»\n])\s+/)
    .filter(s => s.trim().length > 15);

  const chunks = [];
  let buf = '';

  for (const sent of sentences) {
    if ((buf + ' ' + sent).length > CHUNK_SIZE && buf.length > 0) {
      chunks.push({ text: buf.trim(), source });
      buf = buf.slice(-CHUNK_OVERLAP) + ' ' + sent;
    } else {
      buf = buf ? buf + ' ' + sent : sent;
    }
  }
  if (buf.trim().length > 30) chunks.push({ text: buf.trim(), source });
  return chunks;
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }
  if (['.txt', '.md'].includes(ext)) return fs.readFileSync(filePath, 'utf-8');
  throw new Error(`Неизвестный формат: ${ext}`);
}

async function openaiEmbed(texts, retries = 4) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const body = JSON.stringify({ input: texts, model: 'text-embedding-3-small' });
        const req = https.request({
          hostname: 'api.openai.com',
          path: '/v1/embeddings',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Length': Buffer.byteLength(body),
          },
        }, res => {
          let data = '';
          res.on('data', d => data += d);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.error) return reject(new Error(json.error.message));
              if (!json.data) return reject(new Error(JSON.stringify(json)));
              // OpenAI возвращает в порядке индексов, но на всякий случай сортируем
              const sorted = json.data.sort((a, b) => a.index - b.index);
              resolve(sorted.map(d => d.embedding));
            } catch (e) { reject(e); }
          });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
    } catch (e) {
      const wait = attempt * 2000;
      console.warn(`\n  ⚠️  Попытка ${attempt}/${retries}: ${e.message.slice(0, 80)}`);
      if (attempt === retries) throw e;
      console.log(`  ⏳ Ждём ${wait/1000}с...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--clear') {
    await dbClear();
    console.log('База очищена');
    await pool.end();
    return;
  }

  if (!args.length) {
    console.error('Укажи файлы или папку');
    process.exit(1);
  }

  // Собираем файлы
  const files = [];
  for (const arg of args) {
    const stat = fs.statSync(arg);
    if (stat.isDirectory()) {
      fs.readdirSync(arg)
        .filter(f => /\.(docx|txt|md)$/i.test(f))
        .forEach(f => files.push(path.join(arg, f)));
    } else {
      files.push(arg);
    }
  }
  console.log(`Файлов: ${files.length}`);

  // Узнаём какие источники уже есть в БД
  const existingSources = await dbGetSources();
  console.log(`В БД уже: ${existingSources.size} источников`);

  // Чанкуем новые файлы
  const chunksBySource = [];
  for (const file of files) {
    const src = path.basename(file, path.extname(file));
    if (existingSources.has(src)) {
      console.log(`  skip: ${src}`);
      continue;
    }
    try {
      const text = await extractText(file);
      const chunks = chunkText(text, src);
      console.log(`  ${src}: ${chunks.length} чанков`);
      if (chunks.length) chunksBySource.push({ src, chunks });
    } catch (e) {
      console.error(`  ERR ${file}: ${e.message}`);
    }
  }

  if (!chunksBySource.length) { console.log('Нечего добавлять'); await pool.end(); return; }

  const total = chunksBySource.reduce((s, x) => s + x.chunks.length, 0);
  console.log(`\nЭмбеддинги: ${total} чанков из ${chunksBySource.length} источников`);

  // Обрабатываем по источникам
  for (const { src, chunks } of chunksBySource) {
    console.log(`\n  ${src} (${chunks.length} чанков):`);
    let saved = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const batch = chunks.slice(i, i + BATCH);
      const vecs = await openaiEmbed(batch.map(c => c.text));
      await dbInsertBatch(batch, vecs);
      saved += batch.length;
      process.stdout.write(`  ${saved}/${chunks.length}\r`);
      if (i + BATCH < chunks.length) await new Promise(r => setTimeout(r, DELAY_MS));
    }
    console.log(`  OK ${src}: ${saved} чанков`);
  }

  const count = await dbCount();
  console.log(`\nИтого в БД: ${count} чанков`);
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
