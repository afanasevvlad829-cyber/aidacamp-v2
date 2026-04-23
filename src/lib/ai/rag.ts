/**
 * rag.ts — поиск по базе знаний через pgvector
 */

import https from 'node:https';
import pg from 'pg';

const { Pool } = pg;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL   = process.env.DATABASE_URL;
const MIN_SCORE      = 0.4;

// Ленивый пул — создаётся при первом запросе
let _pool: InstanceType<typeof Pool> | null = null;

function getPool() {
  if (!_pool && DATABASE_URL) {
    _pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  }
  return _pool;
}

function openaiEmbed(text: string): Promise<number[]> {
  return new Promise((resolve) => {
    if (!OPENAI_API_KEY) return resolve([]);
    const body = JSON.stringify({ input: [text], model: 'text-embedding-3-small' });
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
      res.on('data', (d: Buffer) => (data += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json?.data?.[0]?.embedding ?? []);
        } catch { resolve([]); }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(8000, () => { req.destroy(); resolve([]); });
    req.write(body);
    req.end();
  });
}

/**
 * Ищет top-K релевантных фрагментов для вопроса.
 * Возвращает строку для вставки в system prompt.
 * При любой ошибке — возвращает '' (бот работает без RAG).
 */
export async function ragContext(question: string, topK = 5): Promise<string> {
  const pool = getPool();
  if (!pool || !OPENAI_API_KEY) return '';

  let qVec: number[];
  try {
    qVec = await openaiEmbed(question);
  } catch {
    return '';
  }
  if (!qVec.length) return '';

  try {
    const { rows } = await pool.query<{ source: string; text: string; score: number }>(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${qVec.join(',')}]`, topK]
    );

    const relevant = rows.filter(r => r.score >= MIN_SCORE);
    if (!relevant.length) return '';

    const texts = relevant
      .map(r => `[${r.source}]\n${r.text}`)
      .join('\n\n---\n\n');

    return `\n\nКОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ (реальные истории и слова Дарьи — используй если релевантно, своими словами):\n\n${texts}\n`;
  } catch {
    return '';
  }
}
