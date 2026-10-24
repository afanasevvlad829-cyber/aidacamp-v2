export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../../lib/fetchWithTimeout';
import { createHash } from 'node:crypto';
import { getPool } from '../../../lib/db';
import { getCurrentPrice } from '../../../data/dynamicPrices';
import { signDiscount } from './token';

async function logFortuneEvent(data: {
  event_type: string;
  discount?: number;
  shift_id?: string;
  name?: string;
  phone?: string;
  order_id?: string;
  final_price?: number;
  orig_price?: number;
  ip?: string | null;
  user_agent?: string | null;
}) {
  try {
    await getPool()?.query(
      `INSERT INTO fortune_events
        (event_type, discount, shift_id, name, phone, order_id, final_price, orig_price, ip, user_agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [data.event_type, data.discount ?? null, data.shift_id ?? null,
       data.name ?? null, data.phone ?? null, data.order_id ?? null,
       data.final_price ?? null, data.orig_price ?? null,
       data.ip ?? null, data.user_agent ?? null]
    );
  } catch (e: any) {
    console.error('[fortune/init] DB log error:', e.message);
  }
}

// Допустимые скидки (белый список)
const VALID_DISCOUNTS = new Set([30, 40, 50, 70]);

// ── env ──────────────────────────────────────────────────────────────────────
const TERMINAL  = process.env.TINKOFF_TERMINAL_KEY;
const PASSWORD  = process.env.TINKOFF_PASSWORD;
const SITE_URL  = process.env.SITE_URL || 'https://dev.aidacamp.ru';

// ── Tinkoff token ─────────────────────────────────────────────────────────────
function tinkoffToken(
  params: Record<string, string | number>,
  password: string
): string {
  const all: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) all[k] = String(v);
  all['Password'] = password;
  const str = Object.keys(all).sort().map((k) => all[k]).join('');
  return createHash('sha256').update(str).digest('hex');
}

// ── handler ───────────────────────────────────────────────────────────────────
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  const FORTUNE_MODE = process.env.FORTUNE_MODE ?? 'lead'; // 'payment' | 'lead' — по умолчанию заявка, без Т-банка

  // Guard: ключи Тинькофф нужны только в режиме реальной оплаты
  if (FORTUNE_MODE === 'payment' && (!TERMINAL || !PASSWORD)) {
    console.error('[fortune/init] TINKOFF_TERMINAL_KEY or TINKOFF_PASSWORD not set');
    return json({ error: 'Платёжный шлюз не настроен' }, 503);
  }

  let body: { shiftId?: string; discount?: number; token?: string; name?: string; phone?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { shiftId = 'shift-1', discount, token, name = '', phone = '', test = false } = body;

  // Белый список скидок
  if (typeof discount !== 'number' || !VALID_DISCOUNTS.has(discount)) {
    return json({ error: 'Неверный discount' }, 400);
  }

  // Проверка HMAC-токена (текущий час + предыдущий для near-boundary)
  const hourSlot = Math.floor(Date.now() / 3_600_000);
  const validTokens = [signDiscount(discount, hourSlot), signDiscount(discount, hourSlot - 1)];
  if (!token || !validTokens.includes(token)) {
    console.warn(`[fortune/init] Invalid token for discount=${discount} token=${token}`);
    return json({ error: 'Недействительный токен скидки' }, 403);
  }

  // Динамическая цена (актуальная на момент запроса)
  const origPrice  = getCurrentPrice(shiftId) ?? getCurrentPrice('shift-1') ?? 93900;
  const finalPrice = Math.round(origPrice * (1 - discount / 100));
  const deposit    = Math.round(finalPrice * 0.5);       // 50% предоплата
  // Тестовый режим: фиксированные 10 рублей вместо реальной суммы
  const kopecks    = test ? 1000 : deposit * 100;        // Tinkoff принимает копейки

  const orderId    = `fortune-${shiftId}-d${discount}-${Date.now()}`;
  const shiftLabels: Record<string, string> = {
    'shift-1':   'Смена 1 (30 мая – 8 июня)',
    'shift-2':   'Смена 2',
    'shift-3':   'Смена 3',
    'shift-4':   'Смена 4',
    'shift-2-1': 'Смена 2.1',
    'shift-2-2': 'Смена 2.2',
  };
  const shiftLabel = shiftLabels[shiftId] ?? shiftId;

  // ── Режим «лид» — без Тинькофф, только уведомление менеджеру ─────────────
  if (FORTUNE_MODE === 'lead') {
    const tgToken  = process.env.TELEGRAM_BOT_TOKEN;
    const tgChatId = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && tgChatId) {
      const mskTime = new Date().toLocaleString('ru', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const tgLines = [
        '🎰 <b>Колесо фортуны — лид (без предоплаты)!</b>',
        '',
        `📞 <b>${phone || '—'}</b>  |  👤 ${name || '—'}`,
        `🎁 Скидка: <b>${discount}%</b>`,
        `🏕 Смена: <b>${shiftLabel}</b>`,
        `💳 Итоговая цена: <b>${finalPrice.toLocaleString('ru')} ₽</b> (было ${origPrice.toLocaleString('ru')} ₽)`,
        '',
        `⚠️ Оплата до конца дня — позвони клиенту!`,
        `🆔 OrderId: <code>${orderId}</code>`,
        `⏱ ${mskTime} МСК`,
      ];
      fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chat_id: tgChatId, text: tgLines.join('\n'), parse_mode: 'HTML' }),
      }).catch(() => {});
    }
    const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
    const ua = request.headers.get('user-agent') ?? null;
    logFortuneEvent({ event_type: 'lead_submit', discount, shift_id: shiftId, name, phone, order_id: orderId, final_price: finalPrice, orig_price: origPrice, ip, user_agent: ua });
    console.log(`[fortune/init] LEAD orderId=${orderId} discount=${discount}% finalPrice=${finalPrice}₽ name="${name}" phone="${phone}"`);
    return json({ leadMode: true, orderId, discount, finalPrice, origPrice });
  }

  // К этой точке дошли только в payment-режиме (lead вернулся раньше выше) —
  // ключи уже проверены гвардом в начале хендлера, здесь только для TS-narrowing.
  if (!TERMINAL || !PASSWORD) {
    return json({ error: 'Платёжный шлюз не настроен' }, 503);
  }

  // Параметры запроса в Тинькофф
  const params: Record<string, string | number> = {
    TerminalKey: TERMINAL,
    Amount:      kopecks,
    OrderId:     orderId,
    Description: `АйДаКемп ${shiftLabel}, скидка ${discount}%. Предоплата 50%.${name ? ' ' + name : ''}`,
    SuccessURL:  `${SITE_URL}/fortune-success/?order=${orderId}&disc=${discount}&dep=${deposit}`,
    FailURL:     `${SITE_URL}/fortune-fail/`,
  };

  const tinkoffSig = tinkoffToken(params, PASSWORD);

  // ── Чек для онлайн-кассы (ФФД 1.2) ──────────────────────────────────────────
  // Параметры соответствуют настройкам терминала:
  //   Налогообложение: УСН доходы-расходы
  //   НДС: без НДС
  //   Способ расчёта: Аванс (предоплата 50%)
  //   Предмет расчёта: Услуга (образовательная, путёвка)
  const receipt = {
    FfdVersion: '1.2',
    Taxation:   'usn_income_outcome',      // УСН доходы-расходы
    ...(phone ? { Phone: phone.replace(/\D/g, '').replace(/^8/, '7').replace(/^/, '+') } : {}),
    Items: [
      {
        Name:          `АйДаКемп ${shiftLabel}${discount > 0 ? `, скидка ${discount}%` : ''} — предоплата 50%`,
        Price:         kopecks,            // цена = сумма предоплаты (1 ед.)
        Quantity:      1,
        Amount:        kopecks,
        Tax:           'vat5',              // НДС 5%
        PaymentMethod: 'advance',          // аванс (предоплата, не полная оплата)
        PaymentObject: 'service',          // услуга (образование / путёвка)
      },
    ],
  };

  // Дополнительные данные для уведомлений
  const extraData: Record<string, string> = {};
  if (phone) extraData['Phone'] = phone;
  if (name)  extraData['Name']  = name;

  let tData: Record<string, any>;
  try {
    const tRes = await fetchWithTimeout('https://securepay.tinkoff.ru/v2/Init', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...params,
        Token:   tinkoffSig,
        Receipt: receipt,
        ...(Object.keys(extraData).length > 0 ? { DATA: extraData } : {}),
      }),
    });
    tData = await tRes.json();
  } catch (err: any) {
    console.error('[fortune/init] Tinkoff fetch error:', err.message);
    return json({ error: 'Ошибка соединения с банком' }, 502);
  }

  if (!tData.Success || !tData.PaymentURL) {
    console.error('[fortune/init] Tinkoff error:', tData.Message, tData.ErrorCode);
    return json({ error: tData.Message || 'Ошибка банка' }, 502);
  }

  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null;
  const ua = request.headers.get('user-agent') ?? null;
  logFortuneEvent({ event_type: 'payment_start', discount, shift_id: shiftId, name, phone, order_id: orderId, final_price: finalPrice, orig_price: origPrice, ip, user_agent: ua });
  console.log(`[fortune/init] OK orderId=${orderId} paymentId=${tData.PaymentId} deposit=${deposit}₽ name="${name}" phone="${phone}"`);

  // ── Telegram-уведомление (fire-and-forget) ────────────────────────────────
  const tgToken  = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    const mskTime = new Date().toLocaleString('ru', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const tgLines = [
      '🎰 <b>Колесо фортуны — лид!</b>',
      '',
      `📞 <b>${phone || '—'}</b>  |  👤 ${name || '—'}`,
      `🎁 Скидка: <b>${discount}%</b>  |  💰 Предоплата: <b>${deposit.toLocaleString('ru')} ₽</b>`,
      `🏕 Смена: <b>${shiftLabel}</b>`,
      `💳 Итоговая цена: <b>${finalPrice.toLocaleString('ru')} ₽</b> (было ${origPrice.toLocaleString('ru')} ₽)`,
      '',
      `🆔 OrderId: <code>${orderId}</code>`,
      `🆔 PaymentId: <code>${tData.PaymentId}</code>`,
      `⏱ ${mskTime} МСК`,
    ];
    fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: tgChatId, text: tgLines.join('\n'), parse_mode: 'HTML' }),
    }).catch(() => {/* fire-and-forget */});
  }

  return json({
    paymentUrl: tData.PaymentURL,
    orderId,
    deposit,
    finalPrice,
    paymentId: tData.PaymentId,
  });
};
