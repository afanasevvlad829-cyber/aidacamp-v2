/**
 * Intent router — классифицирует сообщение и достаёт реальную историю Дарьи под intent=story.
 */
import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { openaiEmbed } from './rag';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

const DATABASE_URL = process.env.DATABASE_URL;
let _pool: InstanceType<typeof pg.Pool> | null = null;
function getPool() {
  if (!_pool && DATABASE_URL) {
    _pool = new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  }
  return _pool;
}

export type Intent = 'story' | 'fact_lookup' | 'experience' | 'general';

const CLASSIFY_SYSTEM = `Классифицируй сообщение родителя ребёнка в IT-лагерь АйДаКемп в одну из категорий.

story — просит рассказать историю/случай/пример из лагеря ("расскажи историю", "был случай", "приведи пример", "весёлую историю")
fact_lookup — спрашивает конкретный факт: цена, дата, документ, правило, процент, условие возврата, трансфер, вычет
experience — выражает тревогу/сомнение за ребёнка ("боится", "переживаю", "не хочет ехать", "стесняется", "будет ли скучать", "справится ли")
general — всё остальное: общие вопросы, подбор смены/курса, small talk

Ответь СТРОГО одним словом: story, fact_lookup, experience или general. Без пояснений.`;

export async function classifyIntent(message: string): Promise<Intent> {
  if (!message?.trim()) return 'general';
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8,
      system: CLASSIFY_SYSTEM,
      messages: [{ role: 'user', content: message }],
    });
    const raw = response.content[0].type === 'text' ? response.content[0].text.trim().toLowerCase() : '';
    if (raw.includes('story')) return 'story';
    if (raw.includes('fact_lookup') || raw.includes('fact')) return 'fact_lookup';
    if (raw.includes('experience')) return 'experience';
    return 'general';
  } catch {
    return 'general';
  }
}

// Тот же порог что и у trusted-тира в rag.ts — это проверенный брендовый контент, не шумные диалоги.
const MIN_SCORE_STORY = 0.42;

export async function pickRealStory(question: string): Promise<{ text: string; source: string } | null> {
  const pool = getPool();
  if (!pool || !question?.trim()) return null;
  try {
    const qVec = await openaiEmbed(question);
    if (!qVec.length) return null;
    const vecStr = `[${qVec.join(',')}]`;
    const { rows } = await pool.query<{ source: string; text: string; score: number }>(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       WHERE source LIKE 'darya_story_%' OR source LIKE 'darya_video_%'
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [vecStr]
    );
    const top = rows[0];
    if (!top || top.score < MIN_SCORE_STORY) return null;
    return { text: top.text, source: top.source };
  } catch {
    return null;
  }
}
