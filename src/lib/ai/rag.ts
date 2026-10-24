/**
 * rag.ts — поиск по базе знаний через pgvector
 *
 * Стратегия (two-tier + pinned):
 * 1. Pinned — для тематических запросов принудительно подтягиваем kb_*
 * 2. Trusted — site:*, kb_*, faq:* — top 5, порог 0.42
 * 3. Dialog — tg_*, wa_* — top 5, порог 0.45 (выше: они шумные)
 *
 * Возвращает структурированные chunks для Anthropic Citations API.
 */

import https from 'node:https';
import pg from 'pg';

const { Pool } = pg;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL   = process.env.DATABASE_URL;

const MIN_SCORE_TRUSTED = 0.42;
const MIN_SCORE_DIALOG  = 0.45;

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

export interface RagChunk {
  source: string;
  text: string;
  score: number;
  pinned?: boolean;
}

export interface RagResult {
  context: string;        // legacy: строка для system prompt
  chunks: RagChunk[];     // structured: массив для Citations API
  isEmpty: boolean;
  trustedCount: number;
}

/**
 * Keyword-pinning — принудительное включение канонических kb_* чанков по теме.
 */
function pinSourcesForQuery(question: string): string[] {
  const qLow = question.toLowerCase();
  const pin: string[] = [];
  if (/прожива|номер|комнат|расселен|как живут|где спят|условия прожив/.test(qLow)) {
    pin.push('kb_on_site_2026');
  }
  if (/меню|кормят|питани|завтрак|обед|ужин|полдник|что едят|как едят|аллерги/.test(qLow)) {
    pin.push('kb_on_site_2026');
  }
  if (/добраться|маршрут|шоссе|трансфер|адрес|где лагерь|как ехать|на машине|солнцево/.test(qLow)) {
    pin.push('kb_logistics_2026');
  }
  if (/игровые рубл|внутренн.*валют|телефонн.*время|мерч|лагерн.*деньг/.test(qLow)) {
    pin.push('kb_game_economy_2026');
  }
  if (/что включ|что входит|что не входит|что взять|с собой|обувь|шапочку|вещи/.test(qLow)) {
    pin.push('kb_whats_included_2026', 'kb_what_to_pack_2026');
  }
  if (/налог|вычет|13%|ндфл/.test(qLow)) {
    pin.push('kb_tax_deduction_2026');
  }
  if (/скидк|акци|дешевл|приведи друг/.test(qLow)) {
    pin.push('kb_prices_discounts_2026');
  }
  if (/возврат|отказ|не понравил/.test(qLow)) {
    pin.push('kb_payment_2026');
  }
  return Array.from(new Set(pin));
}

export async function ragSearch(question: string): Promise<RagResult> {
  const empty: RagResult = { context: '', chunks: [], isEmpty: true, trustedCount: 0 };

  const pool = getPool();
  if (!pool || !OPENAI_API_KEY) return empty;

  let qVec: number[];
  try { qVec = await openaiEmbed(question); }
  catch { return empty; }
  if (!qVec.length) return empty;

  const vecStr = `[${qVec.join(',')}]`;
  const pinSources = pinSourcesForQuery(question);

  try {
    const { rows: trusted } = await pool.query<{ source: string; text: string; score: number }>(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       WHERE source NOT LIKE 'tg_%' AND source NOT LIKE 'wa_%'
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vecStr]
    );
    const trustedOk = trusted.filter(r => r.score >= MIN_SCORE_TRUSTED);

    let dialogOk: typeof trusted = [];
    if (trustedOk.length < 3) {
      const need = 6 - trustedOk.length;
      const { rows: dialogs } = await pool.query<{ source: string; text: string; score: number }>(
        `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
         FROM knowledge_chunks
         WHERE (source LIKE 'tg_%' OR source LIKE 'wa_%')
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [vecStr, need * 2]
      );
      dialogOk = dialogs.filter(r => r.score >= MIN_SCORE_DIALOG).slice(0, need);
    }

    let pinned: typeof trusted = [];
    if (pinSources.length) {
      const { rows: pinnedRows } = await pool.query<{ source: string; text: string; score: number }>(
        `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
         FROM knowledge_chunks WHERE source = ANY($2)`,
        [vecStr, pinSources]
      );
      pinned = pinnedRows;
    }

    const seen = new Set<string>();
    const merged: { source: string; text: string; score: number; pinned?: boolean }[] = [];
    for (const r of pinned) {
      if (!seen.has(r.source)) { merged.push({ ...r, pinned: true }); seen.add(r.source); }
    }
    for (const r of [...trustedOk, ...dialogOk]) {
      if (!seen.has(r.source)) { merged.push({ ...r, pinned: false }); seen.add(r.source); }
    }

    if (!merged.length) return empty;

    const texts = merged.map(r => `[${r.source}]\n${r.text}`).join('\n\n---\n\n');

    return {
      context: `\n\nКОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ (используй если релевантно, своими словами):\n\n${texts}\n`,
      chunks: merged,
      isEmpty: pinned.length === 0 && trustedOk.length === 0,
      trustedCount: trustedOk.length,
    };
  } catch {
    return empty;
  }
}

// Обратная совместимость
export async function ragContext(question: string, _topK = 5): Promise<string> {
  const result = await ragSearch(question);
  return result.context;
}
