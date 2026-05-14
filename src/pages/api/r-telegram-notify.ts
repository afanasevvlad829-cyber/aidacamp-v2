import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const token  = process.env.TELEGRAM_BOT_TOKEN  || import.meta.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID    || import.meta.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return new Response(JSON.stringify({ ok: false }), { status: 200 });
  }

  let body: Record<string, string> = {};
  try { body = await request.json(); } catch {}

  const shift = body.shift || '—';
  const text = `⚡ <b>Спеццена → Telegram</b>\nПользователь перешёл в Telegram со страницы спеццены\nСмена: ${shift}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
