export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../lib/fetchWithTimeout';
import { apiOk, apiBad } from '../../../lib/portalResponse';

export const POST: APIRoute = async ({ request, locals }) => {
  const role = locals.portalRole;
  if (!role) return apiBad('unauthorized', 401);

  let body: any;
  try { body = await request.json(); } catch { return apiBad('invalid json'); }

  const errorText  = String(body.error  || '').slice(0, 1000);
  const context    = String(body.context || '').slice(0, 500);
  const pageUrl    = String(body.url    || '').slice(0, 300);
  const userName   = locals.portalName  || `#${locals.portalSid ?? locals.portalSub ?? '?'}`;

  const token   = process.env.TELEGRAM_BOT_TOKEN;
  const chatId  = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error('[error-report] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return apiBad('Telegram не настроен', 500);
  }

  const now = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const text = [
    `🚨 <b>Ошибка в портале</b>`,
    ``,
    `👤 <b>Пользователь:</b> ${userName} (${role})`,
    `📅 <b>Время:</b> ${now} МСК`,
    `🔗 <b>Страница:</b> ${pageUrl || '—'}`,
    ``,
    `❌ <b>Ошибка:</b>`,
    `<code>${errorText}</code>`,
    context ? `\n📋 <b>Контекст:</b>\n<code>${context}</code>` : '',
  ].filter(Boolean).join('\n');

  console.log(`[error-report] sending to Telegram from ${userName}: ${errorText.slice(0, 100)}`);

  try {
    const res = await fetchWithTimeout(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    });
    const tgResult = await res.json();
    if (!tgResult.ok) {
      console.error('[error-report] Telegram error:', tgResult);
      return apiBad(`Telegram error: ${tgResult.description}`, 500);
    }
  } catch (e: any) {
    console.error('[error-report] fetch failed:', e);
    return apiBad('Ошибка отправки в Telegram', 500);
  }

  return apiOk({ sent: true });
};
