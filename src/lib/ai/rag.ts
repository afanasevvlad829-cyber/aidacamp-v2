/**
 * rag.ts — поиск по базе знаний через pgvector
 *
 * Стратегия (two-tier):
 * 1. Trusted sources (site:*, darya_*, audio_*, publication_*, otzyvy) — top 5, порог 0.42
 * 2. Dialog sources (tg_*, wa_*) — top 5, порог 0.45 (выше: они шумные)
 * Merge: trusted идут первыми, диалоги добавляются если trusted < 3
 */

import https from 'node:https';
import pg from 'pg';

const { Pool } = pg;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL   = process.env.DATABASE_URL;

const MIN_SCORE_TRUSTED = 0.42;
const MIN_SCORE_DIALOG  = 0.45;   // диалоги шумнее — порог выше

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

export interface RagResult {
  context: string;   // строка для system prompt
  isEmpty: boolean;  // true = ничего не нашли выше порога
  trustedCount: number;
}

/**
 * Ищет релевантные фрагменты по двухуровневой стратегии.
 * Возвращает RagResult — caller может решить что делать при isEmpty=true.
 */
export async function ragSearch(question: string): Promise<RagResult> {
  const empty: RagResult = { context: '', isEmpty: true, trustedCount: 0 };

  const pool = getPool();
  if (!pool || !OPENAI_API_KEY) return empty;

  let qVec: number[];
  try {
    qVec = await openaiEmbed(question);
  } catch {
    return empty;
  }
  if (!qVec.length) return empty;

  const vecStr = `[${qVec.join(',')}]`;

  try {
    // Tier 1: проверенные источники
    const { rows: trusted } = await pool.query<{ source: string; text: string; score: number }>(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       WHERE source NOT LIKE 'tg_%' AND source NOT LIKE 'wa_%'
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vecStr]
    );
    const trustedOk = trusted.filter(r => r.score >= MIN_SCORE_TRUSTED);

    // Tier 2: диалоги — только если trusted дал меньше 3
    let dialogOk: typeof trusted = [];
    if (trustedOk.length < 3) {
      const need = 6 - trustedOk.length;
      const { rows: dialogs } = await pool.query<{ source: string; text: string; score: number }>(
        `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
         FROM knowledge_chunks
         WHERE (source LIKE 'tg_%' OR source LIKE 'wa_%')
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [vecStr, need * 2]   // берём с запасом, потом фильтруем
      );
      dialogOk = dialogs.filter(r => r.score >= MIN_SCORE_DIALOG).slice(0, need);
    }

    const all = [...trustedOk, ...dialogOk];
    if (!all.length) return empty;

    const texts = all
      .map(r => `[${r.source}]\n${r.text}`)
      .join('\n\n---\n\n');

    return {
      context: `\n\nКОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ (реальные слова Дарьи и отзывы родителей — используй если релевантно, своими словами):\n\n${texts}\n`,
      isEmpty: false,
      trustedCount: trustedOk.length,
    };
  } catch {
    return empty;
  }
}

// Обратная совместимость для мест где используется старый API
export async function ragContext(question: string, _topK = 5): Promise<string> {
  const result = await ragSearch(question);
  return result.context;
}
