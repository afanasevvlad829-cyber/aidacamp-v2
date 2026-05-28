export const prerender = false;
import type { APIRoute } from 'astro';
import { createHmac } from 'node:crypto';

// Допустимые скидки для смены 1
const VALID_DISCOUNTS = new Set([10, 20, 30, 40, 50, 70]);
const SECRET = process.env.FORTUNE_SECRET || '';

export function signDiscount(discount: number, hourSlot: number): string {
  return createHmac('sha256', SECRET || 'fallback-change-me')
    .update(`${discount}:${hourSlot}`)
    .digest('hex')
    .slice(0, 40);
}

export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  let body: { discount?: number };
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { discount } = body;

  if (typeof discount !== 'number' || !VALID_DISCOUNTS.has(discount)) {
    return json({ error: 'Недопустимая скидка' }, 400);
  }

  const hourSlot = Math.floor(Date.now() / 3_600_000);
  const token = signDiscount(discount, hourSlot);

  return json({ token });
};
