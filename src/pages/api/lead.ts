export const prerender = false;
import type { APIRoute } from 'astro';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const LEADS_DIR = '/var/www/aidacamp-dev/leads';

async function saveLead(lead: Record<string, unknown>) {
  try {
    await mkdir(LEADS_DIR, { recursive: true });
    const line = JSON.stringify({ ...lead, ts: new Date().toISOString() }) + '\n';
    await appendFile(join(LEADS_DIR, 'leads.jsonl'), line);
  } catch {
    // filesystem backup is best-effort
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { phone, age, shift, source } = body;

    // Always save to filesystem first (backup)
    await saveLead({ phone, age, shift, source });

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

    if (!data.ok) {
      // Telegram failed — lead is saved in filesystem backup
      return new Response(JSON.stringify({ ok: true, tg: false }), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500 });
  }
};
