import Anthropic from '@anthropic-ai/sdk';

const prerender = false;
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ""
});
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { system, history = [] } = body;
    if (!system) {
      return new Response(JSON.stringify({ text: "" }), { status: 400 });
    }
    const messages = history.length > 0 ? history.slice(-8).map((m) => ({
      role: m.role,
      content: m.content
    })) : [{ role: "user", content: "Начни." }];
    if (messages[messages.length - 1]?.role === "assistant") {
      messages.push({ role: "user", content: "Продолжай диалог." });
    }
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system,
      messages
    });
    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    return new Response(
      JSON.stringify({ text }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ask-test-mama error:", e);
    return new Response(
      JSON.stringify({ text: "Здравствуйте, расскажите подробнее о лагере" }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
