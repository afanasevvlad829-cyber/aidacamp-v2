export const prerender = false;
import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';

const PASSWORD = import.meta.env.TINKOFF_PASSWORD as string | undefined;

// Tinkoff отправляет уведомление о смене статуса платежа.
// Ответ должен быть строкой "OK".

function verifyToken(body: Record<string, any>, password: string): boolean {
  const received = body['Token'];
  if (!received) return false;

  const all: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === 'Token') continue;
    all[k] = String(v);
  }
  all['Password'] = password;

  const str = Object.keys(all).sort().map((k) => all[k]).join('');
  const expected = createHash('sha256').update(str).digest('hex');
  return expected === received;
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return new Response('INVALID_JSON', { status: 400 });
  }

  // Проверяем подпись
  if (PASSWORD && !verifyToken(body, PASSWORD)) {
    console.warn('[fortune/webhook] invalid token', body['OrderId']);
    return new Response('INVALID_TOKEN', { status: 400 });
  }

  const { Status, OrderId, Amount, PaymentId } = body;
  console.log(`[fortune/webhook] OrderId=${OrderId} Status=${Status} Amount=${Amount} PaymentId=${PaymentId}`);

  // Статусы Тинькофф: NEW, FORM_SHOWED, AUTHORIZING, 3DS_CHECKING, 3DS_CHECKED,
  // AUTHORIZED, CONFIRMING, CONFIRMED, REVERSING, PARTIAL_REVERSED, REVERSED,
  // REFUNDING, PARTIAL_REFUNDED, REFUNDED, REJECTED, CANCELED
  if (Status === 'CONFIRMED') {
    // TODO: обновить статус в БД fortune_reserves
    // TODO: отправить письмо клиенту
    console.log(`[fortune/webhook] PAYMENT CONFIRMED: ${OrderId}, ${Amount / 100}₽`);
  }

  // Тинькофф ждёт строку "OK" в теле ответа
  return new Response('OK', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
};
