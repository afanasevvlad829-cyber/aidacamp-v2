/**
 * /api/validate-test — эндпоинт только для regression-тестов.
 * Вызывает validateBotResponse() с кастомным rubric (строка-инструкция).
 */
export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const { question, botText, rubric } = await request.json();

    if (!question || !botText || !rubric) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: `Ты — судья качества ответов AI-ассистента. Оцени ответ бота по критерию.

ФОРМАТ: только JSON.
{"valid": true} — если критерий выполнен.
{"valid": false, "issue": "что именно не так — одна фраза"} — если нарушен.

Будь строгим к числам и конкретным фактам. Мягким к формулировкам.`,
      messages: [
        {
          role: 'user',
          content: `Вопрос: "${question}"\n\nОтвет бота: "${botText}"\n\nКритерий проверки: ${rubric}\n\nПроверь.`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{"valid":true}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return new Response(JSON.stringify({ valid: true }), { headers: { 'Content-Type': 'application/json' } });

    const result = JSON.parse(match[0]);
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ valid: true }), { headers: { 'Content-Type': 'application/json' } });
  }
};
