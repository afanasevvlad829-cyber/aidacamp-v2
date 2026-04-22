export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../lib/ai/systemPrompt';
import { ResponseSchema } from '../../lib/ai/responseSchema';

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
      system: [
        {
          type: 'text',
          text: systemPrompt,
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

    const parsed = ResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
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

    return new Response(
      JSON.stringify({ state: 'ok', ...parsed.data }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('ask.ts error:', e);
    return new Response(
      JSON.stringify({
        state: 'error',
        text: 'Что-то пошло не так. Попробуйте ещё раз или напишите нам напрямую: <a href="https://wa.me/79688086455">WhatsApp</a>',
        block_type: null,
        block_data: null,
        chips: [{ label: 'Написать в WhatsApp', query: 'хочу поговорить с человеком' }],
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
