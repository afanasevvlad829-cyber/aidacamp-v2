export const prerender = false;
import type { APIRoute } from 'astro';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  return res.ok;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as Record<string, string>;
    const { contact, contact_type, context } = body;

    if (!contact) {
      return new Response(JSON.stringify({ ok: false, error: 'no contact' }), { status: 400 });
    }

    const token  = process.env.TELEGRAM_BOT_TOKEN  || import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID    || import.meta.env.TELEGRAM_CHAT_ID;

    if (token && chatId) {
      const typeLabel: Record<string, string> = {
        phone: '📞 Телефон',
        email: '📧 Email',
        telegram: '✈️ Telegram',
      };
      const label = typeLabel[contact_type] ?? '📬 Контакт';

      const lines: string[] = [
        '💬 <b>Лид из АИ-чата</b>',
        '',
        `${label}: <b>${esc(contact)}</b>`,
        '',
      ];

      if (context) {
        lines.push('<b>Контекст разговора:</b>');
        lines.push('<pre>' + esc(context.slice(0, 600)) + '</pre>');
      }

      lines.push('');
      lines.push(`<i>Источник: /ask/ · ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК</i>`);

      await sendTelegram(token, chatId, lines.join('\n'));
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};
