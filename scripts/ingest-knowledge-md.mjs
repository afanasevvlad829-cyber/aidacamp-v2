#!/usr/bin/env node
/**
 * ingest-knowledge-md.mjs — загружает knowledge/*.md в RAG.
 *
 * Каждый файл:
 *   - Frontmatter (---) даёт source_id и метаданные
 *   - Тело режется по разделам ## (один раздел = один чанк)
 *   - Большие разделы режутся по абзацам
 *   - Перед загрузкой удаляются ВСЕ чанки с этим source_id (полная замена)
 *
 * Запуск:
 *   DATABASE_URL=... OPENAI_API_KEY=... node scripts/ingest-knowledge-md.mjs
 *   node scripts/ingest-knowledge-md.mjs --dry
 */

import https from 'node:https';
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const KNOWLEDGE_DIR = path.resolve(process.cwd(), 'knowledge');

if (!OPENAI_API_KEY && !DRY) { console.error('❌ OPENAI_API_KEY не задан'); process.exit(1); }
if (!fs.existsSync(KNOWLEDGE_DIR)) { console.error(`❌ Папка knowledge/ не найдена`); process.exit(1); }

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });

const CHUNK_MAX = 1200;
const CHUNK_MIN = 80;
const BATCH = 20;
const DELAY_MS = 500;

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: m[2] };
}

function chunkBySection(body) {
  const sections = body.split(/\n(?=## )/g).map(s => s.trim()).filter(Boolean);
  const chunks = [];
  for (const sec of sections) {
    if (sec.length <= CHUNK_MAX) {
      if (sec.length >= CHUNK_MIN) chunks.push(sec);
      continue;
    }
    const paras = sec.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    let buf = '';
    for (const p of paras) {
      if ((buf + '\n\n' + p).length > CHUNK_MAX && buf) {
        if (buf.length >= CHUNK_MIN) chunks.push(buf.trim());
        buf = p;
      } else {
        buf = buf ? buf + '\n\n' + p : p;
      }
    }
    if (buf.length >= CHUNK_MIN) chunks.push(buf.trim());
  }
  return chunks;
}

async function embed(texts) {
  if (DRY) return texts.map(() => new Array(1536).fill(0));
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ input: texts, model: 'text-embedding-3-small' });
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/embeddings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error.message));
          resolve(json.data.map(d => d.embedding));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function ingestFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { meta, body } = parseFrontmatter(raw);
  const sourceId = meta.source_id || `kb_${path.basename(filePath, '.md')}`;
  const chunks = chunkBySection(body);

  console.log(`\n📄 ${path.basename(filePath)}`);
  console.log(`   source: ${sourceId}`);
  console.log(`   topic:  ${meta.topic || '—'}`);
  console.log(`   чанков: ${chunks.length}`);

  if (DRY) return chunks.length;

  await pool.query('DELETE FROM knowledge_chunks WHERE source = $1', [sourceId]);

  let inserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embed(batch);
    for (let j = 0; j < batch.length; j++) {
      await pool.query(
        `INSERT INTO knowledge_chunks (source, text, embedding, created_at)
         VALUES ($1, $2, $3::vector, NOW())`,
        [sourceId, batch[j], `[${embeddings[j].join(',')}]`]
      );
      inserted++;
    }
    if (i + BATCH < chunks.length) await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log(`   ✅ загружено: ${inserted}`);
  return inserted;
}

async function main() {
  console.log('🚀 Ingest knowledge/*.md → RAG\n');
  if (DRY) console.log('⚠️  DRY режим\n');

  const files = fs.readdirSync(KNOWLEDGE_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => path.join(KNOWLEDGE_DIR, f));

  if (!files.length) { console.log('Нет .md файлов'); return; }

  let total = 0;
  for (const f of files) {
    try { total += await ingestFile(f); }
    catch (e) { console.error(`❌ ${path.basename(f)}: ${e.message}`); }
  }

  console.log(`\n✅ Готово. ${total} чанков из ${files.length} файлов.`);
  if (!DRY) await pool.end();
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
