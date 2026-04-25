const prerender = false;
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
async function sendTelegram(token, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" })
  });
  return res.ok;
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { contact, contact_type, context } = body;
    if (!contact) {
      return new Response(JSON.stringify({ ok: false, error: "no contact" }), { status: 400 });
    }
    const token = process.env.TELEGRAM_BOT_TOKEN || "8663835446:AAEJAemhHYPlVTc2RiLP3sBtsqCF9fBdhZ4";
    const chatId = process.env.TELEGRAM_CHAT_ID || "-1003827680494";
    if (token && chatId) {
      const typeLabel = {
        phone: "📞 Телефон",
        email: "📧 Email",
        telegram: "✈️ Telegram"
      };
      const label = typeLabel[contact_type] ?? "📬 Контакт";
      const lines = [
        "💬 <b>Лид из АИ-чата</b>",
        "",
        `${label}: <b>${esc(contact)}</b>`,
        ""
      ];
      if (context) {
        lines.push("<b>Контекст разговора:</b>");
        lines.push("<pre>" + esc(context.slice(0, 600)) + "</pre>");
      }
      lines.push("");
      lines.push(`<i>Источник: /ask/ · ${(/* @__PURE__ */ new Date()).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} МСК</i>`);
      await sendTelegram(token, chatId, lines.join("\n"));
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
