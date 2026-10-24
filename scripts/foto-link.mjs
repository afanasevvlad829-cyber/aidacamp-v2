#!/usr/bin/env node
/**
 * foto-link.mjs — печатает подписанные ссылки на альбомы смен.
 *
 * Альбомы /foto/<id> закрыты с 27.08.2026: раньше их защищало только незнание URL,
 * а это фото и распознанные лица детей. Ссылку с токеном отдавать родителям
 * (канал смены, памятка, личное сообщение) — по ней ставится кука на 60 дней.
 *
 *   node scripts/foto-link.mjs            # ссылки на все смены
 *   node scripts/foto-link.mjs smena-1    # на конкретную
 *
 * Секрет LEAD_LINK_SECRET берётся из окружения (на проде — /var/www/aidacamp/.env.prod).
 * Токен детерминирован: одна и та же смена всегда даёт одну ссылку. Отозвать
 * выданные ссылки можно только сменой LEAD_LINK_SECRET — это оборвёт и памятки.
 */
import { createHmac } from 'node:crypto';

const secret = process.env.LEAD_LINK_SECRET;
if (!secret) {
  console.error('LEAD_LINK_SECRET не задан — ссылку подписать нечем (fail-closed).');
  process.exit(1);
}

const base = process.env.FOTO_LINK_BASE || 'https://aidacamp.ru';
const sign = (id) => createHmac('sha256', secret).update(`foto:${id}`).digest('hex').slice(0, 10);

const arg = process.argv[2];
if (arg) {
  console.log(`${base}/foto/${arg}?s=${sign(arg)}`);
  process.exit(0);
}

const { allShiftsIncludingArchived } = await import('../src/data/shifts.ts').catch(() => ({}));
if (!allShiftsIncludingArchived) {
  console.error('Не удалось прочитать список смен — укажи id смены аргументом.');
  process.exit(1);
}
for (const s of allShiftsIncludingArchived) {
  console.log(`${s.id.padEnd(24)} ${base}/foto/${s.id}?s=${sign(s.id)}`);
}
