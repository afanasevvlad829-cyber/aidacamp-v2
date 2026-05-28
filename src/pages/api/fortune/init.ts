export const prerender = false;
import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { getCurrentPrice } from '../../../data/dynamicPrices';

// ── env ──────────────────────────────────────────────────────────────────────
const TERMINAL  = import.meta.env.TINKOFF_TERMINAL_KEY as string | undefined;
const PASSWORD  = import.meta.env.TINKOFF_PASSWORD     as string | undefined;
const SITE_URL  = (import.meta.env.SITE_URL || 'https://dev.aidacamp.ru') as string;

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

  // Guard: ключи не настроены
  if (!TERMINAL || !PASSWORD) {
    console.error('[fortune/init] TINKOFF_TERMINAL_KEY or TINKOFF_PASSWORD not set');
    return json({ error: 'Платёжный шлюз не настроен' }, 503);
  }

  let body: { shiftId?: string; discount?: number; name?: string; phone?: string; test?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { shiftId = 'shift-1', discount, name = '', phone = '', test = false } = body;

  if (typeof discount !== 'number' || discount < 0 || discount > 100) {
    return json({ error: 'Неверный discount' }, 400);
  }

  // Динамическая цена (актуальная на момент запроса)
  const origPrice  = getCurrentPrice(shiftId) ?? 85900;
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

  // Параметры запроса в Тинькофф
  const params: Record<string, string | number> = {
    TerminalKey: TERMINAL,
    Amount:      kopecks,
    OrderId:     orderId,
    Description: `АйДаКемп ${shiftLabel}, скидка ${discount}%. Предоплата 50%.${name ? ' ' + name : ''}`,
    SuccessURL:  `${SITE_URL}/fortune-success/?order=${orderId}&disc=${discount}&dep=${deposit}`,
    FailURL:     `${SITE_URL}/fortune-fail/`,
  };

  const token = tinkoffToken(params, PASSWORD);

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
    const tRes = await fetch('https://securepay.tinkoff.ru/v2/Init', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        ...params,
        Token:   token,
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

  console.log(`[fortune/init] OK orderId=${orderId} paymentId=${tData.PaymentId} deposit=${deposit}₽ name="${name}" phone="${phone}"`);

  return json({
    paymentUrl: tData.PaymentURL,
    orderId,
    deposit,
    finalPrice,
    paymentId: tData.PaymentId,
  });
};
