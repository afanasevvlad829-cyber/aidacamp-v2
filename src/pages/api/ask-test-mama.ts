export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MamaRequest {
  system: string;
  history: ChatMessage[];
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body: MamaRequest = await request.json();
    const { system, history = [] } = body;

    if (!system) {
      return new Response(JSON.stringify({ text: '' }), { status: 400 });
    }

    // Конвертируем историю: assistant ↔ user (мама видит ответы бота как "assistant")
    const messages: Anthropic.MessageParam[] = history.length > 0
      ? history.slice(-8).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      : [{ role: 'user', content: 'Начни.' }];

    // Если последнее сообщение от assistant — добавляем "продолжай"
    if (messages[messages.length - 1]?.role === 'assistant') {
      messages.push({ role: 'user', content: 'Продолжай диалог.' });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system,
      messages,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';

    return new Response(
      JSON.stringify({ text }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('ask-test-mama error:', e);
    return new Response(
      JSON.stringify({ text: 'Здравствуйте, расскажите подробнее о лагере' }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }
};
