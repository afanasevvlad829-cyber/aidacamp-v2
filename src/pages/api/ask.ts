export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../../lib/ai/systemPrompt';
import { ResponseSchema } from '../../lib/ai/responseSchema';
import { ragSearch } from '../../lib/ai/rag';
import { findPhotos } from '../../lib/ai/photoSearch';
import { readFileSync } from 'node:fs';

// Загружаем живые данные смен с сервера (обновляются cron'ом ежедневно)
function getLivePrompt(): string {
  try {
    const raw = readFileSync('/var/www/aidacamp-data/shifts.json', 'utf-8');
    const data = JSON.parse(raw);
    if (data?.shifts?.length >= 4) {
      return buildSystemPrompt(data.shifts);
    }
  } catch { /* файл не найден — используем campData */ }
  return buildSystemPrompt();
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskRequest {
  message: string;
  history: ChatMessage[];
  sessionId?: string;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

// Ключевые слова фактических вопросов — при отсутствии RAG-контекста не генерируем факты
const FACTUAL_KEYWORDS = [
  'трансфер', 'автобус', 'добраться', 'доехать', 'дорога', 'адрес',
  'стоит', 'цена', 'стоимость', 'сколько', 'рублей', 'оплат',
  'когда', 'дата', 'числа', 'июн', 'август', 'май', 'смена',
  'соседи', 'комнат', 'живут', 'поселен',
  'преподаватель', 'педагог', 'учитель', 'вожатый',
  'документ', 'справк', 'договор', 'лицензи',
];

function isFactualQuestion(q: string): boolean {
  const lower = q.toLowerCase();
  return FACTUAL_KEYWORDS.some(kw => lower.includes(kw));
}

// Ответ-редирект к менеджеру — когда нет RAG для фактического вопроса
const NO_RAG_FACTUAL = JSON.stringify({
  state: 'ok',
  text: 'По этому вопросу лучше уточнить напрямую — менеджер ответит точно и быстро.',
  block_type: null,
  block_data: null,
  chips: [
    { label: 'Написать в WhatsApp', action: 'contact_request' },
    { label: 'Смены 2026', query: 'смены и цены' },
    { label: 'Условия', query: 'условия проживания' },
  ],
});

// Резервный ответ при таймауте — лучше чем пустой экран
const TIMEOUT_FALLBACK = JSON.stringify({
  state: 'ok',
  text: 'Что-то подвисло на сервере — бывает. Напишите нам напрямую, ответим быстро: <a href="https://wa.me/79688086455" target="_blank" rel="noopener">WhatsApp</a> или <a href="https://t.me/Progaschool" target="_blank" rel="noopener">Telegram @Progaschool</a>.',
  block_type: null,
  block_data: null,
  chips: [
    { label: 'Попробовать ещё раз', query: '' },
    { label: 'Написать менеджеру', action: 'contact_request' },
  ],
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: AskRequest = await request.json();
    const { message, history = [] } = body;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ state: 'error', text: 'Пустое сообщение' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // RAG: ищем релевантные фрагменты из базы знаний (параллельно со сборкой промпта)
    const [ragResult, basePrompt] = await Promise.all([
      ragSearch(message),
      Promise.resolve(getLivePrompt()),
    ]);

    // HARD GATE: фактический вопрос + нет RAG-контекста → редирект к менеджеру
    // Исключение: вопросы про смены/цены/курсы покрыты facts в системном промпте
    const factKeywordsNotInFacts = [
      'трансфер', 'автобус', 'добраться', 'доехать',
      'соседи', 'комнат', 'поселен',
      'преподаватель', 'педагог', 'учитель',
      'документ', 'справк',
    ];
    const needsRagGate = factKeywordsNotInFacts.some(kw => message.toLowerCase().includes(kw));
    if (needsRagGate && ragResult.isEmpty) {
      return new Response(NO_RAG_FACTUAL, { headers: { 'Content-Type': 'application/json' } });
    }

    const systemText = basePrompt + ragResult.context;

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      temperature: 0,
      system: [
        {
          type: 'text',
          text: systemText,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON even if Claude wraps it in ```json ... ```
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // AI returned plain text (e.g. for sensitive/negative questions) — wrap it gracefully
      const cleanText = raw.replace(/```[\s\S]*?```/g, '').trim() || 'Уточните вопрос.';
      console.warn('No JSON in response, using raw text as fallback. Length:', raw.length);
      return new Response(
        JSON.stringify({
          state: 'ok',
          text: cleanText,
          block_type: null,
          block_data: null,
          chips: [
            { label: 'Смены 2026', query: 'смены' },
            { label: 'Цены', query: 'цены' },
            { label: 'Написать менеджеру', action: 'contact_request' },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Robust JSON parse: Claude sometimes embeds literal newlines inside string values
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      // Try fixing unescaped newlines inside JSON string values
      const fixed = jsonMatch[0].replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_m, s) => '"' + s.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
      );
      try { parsedJson = JSON.parse(fixed); }
      catch { parsedJson = null; }
    }
    if (!parsedJson) {
      console.warn('JSON parse failed even after sanitization');
      return new Response(
        JSON.stringify({ state: 'ok', text: raw.replace(/```json|```|\{[\s\S]*\}/g, '').trim() || 'Уточните вопрос.',
          block_type: null, block_data: null,
          chips: [{ label: 'Смены 2026', query: 'смены' }, { label: 'Цены', query: 'цены' }, { label: 'Написать менеджеру', action: 'contact_request' }] }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    const parsed = ResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      // Fallback: return just the text
      return new Response(
        JSON.stringify({
          state: 'ok',
          text: raw.replace(/```json|```/g, '').trim(),
          block_type: null,
          block_data: null,
          chips: [
            { label: 'Смены 2026', query: 'смены' },
            { label: 'Цены', query: 'цены' },
            { label: 'Забронировать', action: 'book' },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    const responseData = { ...parsed.data };

    // Если бот попросил галерею — подбираем фото по запросу
    if (responseData.block_type === 'gallery') {
      const photoQuery = (responseData.block_data as any)?.query || message;
      responseData.block_data = { photos: findPhotos(photoQuery, 3) };
    }

    return new Response(
      JSON.stringify({ state: 'ok', ...responseData }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('ask.ts error:', e?.name, e?.message);
    // Таймаут AbortController или сетевая ошибка — отдаём резерв вместо пустого экрана
    return new Response(TIMEOUT_FALLBACK, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
