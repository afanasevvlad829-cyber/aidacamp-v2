/**
 * rag.ts — поиск по базе знаний через pgvector
 *
 * Стратегия (two-tier):
 * 1. Trusted sources — БЕЛЫЙ СПИСОК брендовых префиксов (TRUSTED_PATTERNS) — top 5, порог 0.42
 * 2. Dialog sources (tg_*, wa_*) — top 5, порог 0.45 (выше: они шумные)
 * Merge: trusted идут первыми, диалоги добавляются если trusted < 3
 *
 * knowledge_chunks — общая таблица всего проекта: там же SEO-статьи (seo-ext*),
 * внутренние отчёты (report:*), заметки (notes:*), сессии Claude (claude*),
 * контент других сайтов (site-codims*, site-icepartners*, vlad-a* и т.д.) —
 * бот НЕ должен это видеть, поэтому только whitelist, не blacklist.
 */

import https from 'node:https';
import { getPool } from '../db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const MIN_SCORE_TRUSTED = 0.42;
const MIN_SCORE_DIALOG  = 0.45;   // диалоги шумнее — порог выше

/**
 * Белый список брендовых источников (LIKE-паттерны; `\_` — экранированный
 * underscore, иначе `_` в LIKE = «любой символ» и 'site_%' зацепит 'site-codims').
 * Проверено по прод-базе 17.07.2026 (SELECT split_part(source,':',1), count(*)).
 */
export const TRUSTED_PATTERNS = [
  'site:%',            // краулинг aidacamp.ru
  'site\\_%',          // курируемые блоки: site_facts_2026, site_faq_2026, site_reviews_2026, site_stories_2026, site_objections_2026
  'darya\\_%',         // darya_qa / darya_story / darya_video
  'article%',          // статьи блога aidacamp
  'publication%',      // публикации (Дзен/VK)
  'pub\\_%',           // публикации (короткий префикс)
  'otzyvy%',           // отзывы (на 17.07.2026 в базе 0 строк — задел)
  'audio\\_%',         // транскрипты аудио Дарьи
  'kb\\_%',            // курируемая база фактов: kb_shifts_2026, kb_prices_discounts_2026, kb_tax_deduction_2026 и т.п.
  'accommodation\\_%', // accommodation_detailed_2026 — проживание
  'menu\\_%',          // menu_detailed_2026 — питание
  // Возвращены после парного эвала 17.07 (просадка по темам «цена»/«документы»):
  'ceny',              // контент страницы цен — 38 чанков
  'faq',               // FAQ сайта
  'ДОГОВОР%',          // договор бронирования — условия возврата/оплаты, 62 чанка
];

export function openaiEmbed(text: string): Promise<number[]> {
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

export interface RagHit {
  source: string;
  score: number;
}

export interface RagResult {
  context: string;   // строка для system prompt
  isEmpty: boolean;  // true = ничего не нашли выше порога
  trustedCount: number;
  hits: RagHit[];    // что реально вошло в контекст (оба тира) — для лога в rag_hits
}

/**
 * Ищет релевантные фрагменты по двухуровневой стратегии.
 * Возвращает RagResult — caller может решить что делать при isEmpty=true.
 */
export async function ragSearch(question: string): Promise<RagResult> {
  const empty: RagResult = { context: '', isEmpty: true, trustedCount: 0, hits: [] };

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
    // Tier 1: проверенные источники — только белый список брендовых префиксов
    const { rows: trusted } = await pool.query<{ source: string; text: string; score: number }>(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       WHERE source LIKE ANY ($2::text[])
       ORDER BY embedding <=> $1::vector
       LIMIT 5`,
      [vecStr, TRUSTED_PATTERNS]
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
      hits: all.map(r => ({ source: r.source, score: Math.round(r.score * 1000) / 1000 })),
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
