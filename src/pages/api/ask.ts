export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { systemPrompt } from '../../lib/ai/systemPrompt';
import { ResponseSchema } from '../../lib/ai/responseSchema';
import { validateBotResponse, logGuardFlag } from '../../lib/ai/validator';

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

    const rawParsed = JSON.parse(jsonMatch[0]);
    const parsed = ResponseSchema.safeParse(rawParsed);
    if (!parsed.success) {
      // Fallback: extract text field if present, don't dump raw JSON
      const fallbackText = typeof rawParsed?.text === 'string'
        ? rawParsed.text
        : raw.replace(/```json[\s\S]*?```|```[\s\S]*?```/g, '').replace(/\{[\s\S]*\}/, '').trim() || 'Уточните вопрос.';
      console.warn('ResponseSchema parse failed:', parsed.error.issues.slice(0,3));
      return new Response(
        JSON.stringify({
          state: 'ok',
          text: fallbackText,
          block_type: rawParsed?.block_type ?? null,
          block_data: rawParsed?.block_data ?? null,
          chips: rawParsed?.chips ?? [
            { label: 'Смены 2026', query: 'смены' },
            { label: 'Цены', query: 'цены' },
            { label: 'Забронировать', action: 'book' },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // === VALIDATOR: check for hallucinations in background ===
    const botText = parsed.data.text ?? '';

    // Run validation async, don't block response
    validateBotResponse(message, botText).then((validation) => {
      if (!validation.valid && validation.issue && validation.correction) {
        logGuardFlag(message, botText, validation.issue, validation.correction, false);
        console.warn('[guard] hallucination caught:', validation.issue);
      }
    }).catch(() => {/* silent */});

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
