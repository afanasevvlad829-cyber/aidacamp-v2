export const prerender = false;
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { phone, age, shift, source } = await request.json();

    const token = process.env.TELEGRAM_BOT_TOKEN || import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID || import.meta.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return new Response(JSON.stringify({ ok: false, error: 'No token' }), { status: 500 });
    }

    const isReferral = source === 'refer';
    const text = [
      isReferral ? '🎁 Реферальная заявка!' : '🎯 Новая заявка АйДаКемп',
      `Возраст: ${age || '—'}`,
      `Телефон: ${phone}`,
      shift ? `Смена: ${shift}` : '',
      isReferral ? '→ Отправить мерч тому кто поделился!' : '',
    ].filter(Boolean).join('\n');

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      }
    );

    const data = await res.json();
    return new Response(JSON.stringify({ ok: data.ok }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
