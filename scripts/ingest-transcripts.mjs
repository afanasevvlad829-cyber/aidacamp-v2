#!/usr/bin/env node
/**
 * ingest-transcripts.mjs — загружает транскрипты видео и публикацию Дарьи в RAG.
 *
 * Источники:
 *   - _notes/АйДаКемп/Транскрипты/*.txt  — транскрипты коротких видео и консультаций
 *   - _notes/АйДаКемп/Публикация*.txt    — публикация Дарьи как мамы-тестировщика
 *
 * Запуск:
 *   node scripts/ingest-transcripts.mjs [--dry]
 */

import https from 'node:https';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';

if (!OPENAI_API_KEY && !DRY) { console.error('❌  OPENAI_API_KEY не задан'); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 100;
const DELAY_MS = 500;

function chunkText(text, source) {
  const paras = text.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 30);
  if (paras.length === 0) return [{ text: text.trim(), source }];
  const chunks = [];
  let buf = '';
  for (const para of paras) {
    if ((buf + '\n' + para).length > CHUNK_SIZE && buf.length > 0) {
      chunks.push({ text: buf.trim(), source });
      buf = buf.slice(-CHUNK_OVERLAP) + '\n' + para;
    } else {
      buf = buf ? buf + '\n' + para : para;
    }
  }
  if (buf.trim().length > 30) chunks.push({ text: buf.trim(), source });
  return chunks;
}

async function embed(texts) {
  if (DRY) return texts.map(() => new Array(1536).fill(0));
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ input: texts, model: 'text-embedding-3-small' });
    const req = https.request({
      hostname: 'api.openai.com', path: '/v1/embeddings', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Length': Buffer.byteLength(body) },
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data).data.map(d => d.embedding)); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function sourceExists(client, source) {
  const r = await client.query('SELECT 1 FROM knowledge_chunks WHERE source=$1 LIMIT 1', [source]);
  return r.rowCount > 0;
}

async function insertChunks(chunks) {
  if (!chunks.length) return;
  const client = await pool.connect();
  try {
    const texts = chunks.map(c => c.text);
    const vecs = await embed(texts);
    for (let i = 0; i < chunks.length; i++) {
      if (!DRY) {
        await client.query(
          'INSERT INTO knowledge_chunks (content, embedding, source) VALUES ($1, $2, $3)',
          [chunks[i].text, JSON.stringify(vecs[i]), chunks[i].source]
        );
      }
    }
  } finally { client.release(); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function makeSourceId(filename) {
  // "20240613 - Что может быть в первые три дня в лагере.txt"
  // → "audio_20240613_pervye-tri-dnya"
  const date = filename.match(/^(\d{8})/)?.[1] || 'unknown';
  const slug = filename
    .replace(/^\d+\s*-\s*/, '')
    .replace(/\.txt$/, '')
    .toLowerCase()
    .replace(/[^а-яёa-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '');
  return `audio_${date}_${slug}`;
}

async function ingestTranscripts() {
  const client = await pool.connect();
  let existing;
  try {
    const r = await client.query('SELECT DISTINCT source FROM knowledge_chunks WHERE source LIKE \'audio_%\' OR source LIKE \'publication_%\'');
    existing = new Set(r.rows.map(r => r.source));
  } finally { client.release(); }

  console.log(`\n🎙️  Загрузка транскриптов в RAG\n`);
  if (DRY) console.log('⚠️  DRY режим — БД не трогаем\n');
  console.log(`Уже в БД: ${existing.size} audio/publication источников\n`);

  const transcriptsDir = path.join(process.cwd(), '_notes/АйДаКемп/Транскрипты');
  const notesDir = path.join(process.cwd(), '_notes/АйДаКемп');

  let total = 0;

  // ── Транскрипты ──────────────────────────────────────────
  if (fs.existsSync(transcriptsDir)) {
    const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith('.txt')).sort();
    for (const file of files) {
      const source = makeSourceId(file);
      if (existing.has(source)) {
        console.log(`  skip (уже есть): ${source}`);
        continue;
      }

      const raw = fs.readFileSync(path.join(transcriptsDir, file), 'utf-8');
      // Strip header lines (ФАЙЛ: ... / КЛЮЧЕВЫЕ СЛОВА: ... / ----)
      const body = raw.split(/[-]{4,}/)[1]?.trim() ?? raw.trim();

      if (body.length < 30) {
        console.log(`  skip (слишком короткий): ${file}`);
        continue;
      }

      // Prepend context so RAG knows this is from Darya
      const titleLine = file.replace(/\.txt$/, '').replace(/^\d+\s*-\s*/, '');
      const enriched = `ГОЛОС ДАРЬИ АФАНАСЬЕВОЙ (основатель АйДаКемп) — "${titleLine}"\n\n${body}`;

      const chunks = chunkText(enriched, source);
      console.log(`  ${source}: ${chunks.length} чанков`);
      if (chunks[0]) console.log(`    "${chunks[0].text.slice(0, 80)}..."`);

      await insertChunks(chunks);
      total += chunks.length;
      await sleep(DELAY_MS);
    }
  }

  // ── Публикации ───────────────────────────────────────────
  const pubFiles = fs.existsSync(notesDir)
    ? fs.readdirSync(notesDir).filter(f => f.startsWith('Публикация') && f.endsWith('.txt'))
    : [];

  for (const file of pubFiles) {
    const source = 'publication_mama_tester';
    if (existing.has(source)) {
      console.log(`  skip (уже есть): ${source}`);
      continue;
    }

    const raw = fs.readFileSync(path.join(notesDir, file), 'utf-8');
    const enriched = `ПУБЛИКАЦИЯ ДАРЬИ АФАНАСЬЕВОЙ (основатель АйДаКемп) — личная история мамы, которая запустила IT-лагерь\n\n${raw}`;
    const chunks = chunkText(enriched, source);
    console.log(`  ${source}: ${chunks.length} чанков`);
    if (chunks[0]) console.log(`    "${chunks[0].text.slice(0, 80)}..."`);

    await insertChunks(chunks);
    total += chunks.length;
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Готово. Добавлено ${total} новых чанков`);
  await pool.end();
}

ingestTranscripts().catch(e => { console.error(e); process.exit(1); });
