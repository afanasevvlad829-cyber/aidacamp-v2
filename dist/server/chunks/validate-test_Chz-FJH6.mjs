import Anthropic from '@anthropic-ai/sdk';

const prerender = false;
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ""
});
const POST = async ({ request }) => {
  try {
    const { question, botText, rubric } = await request.json();
    if (!question || !botText || !rubric) {
      return new Response(JSON.stringify({ valid: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: `Ты — судья качества ответов AI-ассистента. Оцени ответ бота по критерию.

ФОРМАТ: только JSON.
{"valid": true} — если критерий выполнен.
{"valid": false, "issue": "что именно не так — одна фраза"} — если нарушен.

Будь строгим к числам и конкретным фактам. Мягким к формулировкам.`,
      messages: [
        {
          role: "user",
          content: `Вопрос: "${question}"

Ответ бота: "${botText}"

Критерий проверки: ${rubric}

Проверь.`
        }
      ]
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : '{"valid":true}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return new Response(JSON.stringify({ valid: true }), { headers: { "Content-Type": "application/json" } });
    const result = JSON.parse(match[0]);
    return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ valid: true }), { headers: { "Content-Type": "application/json" } });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
