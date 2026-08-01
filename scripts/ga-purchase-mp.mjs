#!/usr/bin/env node
/**
 * ga-purchase-mp.mjs — отправка оплат из AlfaCRM в GA4 через Measurement Protocol.
 *
 * Зачем: GA видит «отправил форму», а не «заплатил». Без этого отчёты GA по
 * каналам показывают лиды, а не деньги, и сравнить каналы по выручке нельзя.
 *
 * Как связываем платёж с визитом: crm_payments.customer_id → pamyatka_bindings.crm_id
 * → ga_client_id (куки `_ga`, пишется при открытии памятки, см. /api/bind-lead).
 * Клиенты без открытой памятки в GA не попадут — это ожидаемо, не ошибка.
 *
 * Идемпотентность двойная: таблица ga_mp_sent (branch, payment_id) на нашей
 * стороне + transaction_id на стороне GA.
 *
 * Окно: только платежи за последние GA_MP_WINDOW_DAYS дней. Событие уходит без
 * timestamp_micros, то есть датируется моментом отправки — поэтому крон должен
 * ходить часто (раз в час), иначе оплата уедет в GA не тем днём.
 *
 * Запуск:
 *   node scripts/ga-purchase-mp.mjs             # боевой прогон
 *   node scripts/ga-purchase-mp.mjs --dry-run   # показать, что отправилось бы
 *   node scripts/ga-purchase-mp.mjs --debug     # debug-эндпоинт GA: валидирует payload, НЕ метит отправленным
 *
 * Важно: боевой эндпоинт отвечает 204 на что угодно, включая неверный api_secret.
 * Проверять, что события дошли, — в GA4 → Отчёты → В реальном времени / DebugView.
 *
 * Секреты — из /var/www/aidacamp/.env.prod (сайт читает только этот файл):
 *   GA4_MEASUREMENT_ID  (по умолчанию G-PGMT3ET16X)
 *   GA4_MP_API_SECRET   ← создаётся руками в интерфейсе GA4, см. README/отчёт
 *   AIDAPLUS_PG_DSN
 */

import fs from 'node:fs';
import pg from 'pg';

const ENV_FILE = process.env.GA_MP_ENV_FILE || '/var/www/aidacamp/.env.prod';
const WINDOW_DAYS = Number(process.env.GA_MP_WINDOW_DAYS || 7);
const DRY = process.argv.includes('--dry-run');
const DEBUG = process.argv.includes('--debug');

/** pay_type_id в AlfaCRM: 1 = приход. 7 и прочие — расходы/возвраты, их не шлём. */
const PAY_TYPE_INCOME = 1;

function loadEnvFile(file) {
  const out = {};
  let raw = '';
  try { raw = fs.readFileSync(file, 'utf8'); } catch { return out; }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

function log(...a) { console.log(new Date().toISOString(), ...a); }

async function main() {
  const env = { ...loadEnvFile(ENV_FILE), ...process.env };
  const measurementId = env.GA4_MEASUREMENT_ID || 'G-PGMT3ET16X';
  const apiSecret = env.GA4_MP_API_SECRET;
  const dsn = env.AIDAPLUS_PG_DSN || env.PG_DSN;

  if (!dsn) { console.error('нет AIDAPLUS_PG_DSN'); process.exit(1); }
  if (!apiSecret && !DRY) {
    console.error(`нет GA4_MP_API_SECRET в ${ENV_FILE} — создать в GA4: Администратор → Потоки данных → поток → Measurement Protocol API secrets`);
    process.exit(1);
  }

  const c = new pg.Client({ connectionString: dsn });
  await c.connect();

  await c.query(`CREATE TABLE IF NOT EXISTS ga_mp_sent(
    branch int not null,
    payment_id bigint not null,
    crm_id int,
    ga_client_id text,
    value numeric,
    status text,
    sent_at timestamptz default now(),
    primary key (branch, payment_id)
  )`);

  const { rows } = await c.query(
    `SELECT p.branch, p.id, p.customer_id, p.pay_date, p.summa, b.ga_client_id
       FROM crm_payments p
       JOIN LATERAL (
         SELECT ga_client_id
           FROM pamyatka_bindings
          WHERE crm_id = p.customer_id
            AND ga_client_id IS NOT NULL
            AND is_manager = false
          ORDER BY created_at DESC
          LIMIT 1
       ) b ON true
       LEFT JOIN ga_mp_sent s ON s.branch = p.branch AND s.payment_id = p.id
      WHERE p.pay_type_id = $1
        AND p.summa > 0
        AND p.pay_date >= CURRENT_DATE - ($2 || ' days')::interval
        AND s.payment_id IS NULL
      ORDER BY p.pay_date`,
    [PAY_TYPE_INCOME, String(WINDOW_DAYS)],
  );

  if (!rows.length) { log('новых оплат для GA нет'); await c.end(); return; }
  log(`к отправке: ${rows.length}`);

  const endpoint = DEBUG
    ? 'https://www.google-analytics.com/debug/mp/collect'
    : 'https://www.google-analytics.com/mp/collect';

  let sent = 0, failed = 0;
  for (const r of rows) {
    const value = Number(r.summa);
    const transactionId = `alfa-${r.branch}-${r.id}`;
    const payload = {
      client_id: r.ga_client_id,
      events: [{
        name: 'purchase',
        params: {
          transaction_id: transactionId,
          value,
          currency: 'RUB',
          items: [{ item_id: 'camp-shift', item_name: 'Путёвка в лагерь', price: value, quantity: 1 }],
        },
      }],
    };

    if (DRY) {
      log('DRY', transactionId, `crm:${r.customer_id}`, `${value}₽`, `cid:${r.ga_client_id}`);
      continue;
    }

    let status = 'ok';
    try {
      const res = await fetch(
        `${endpoint}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) },
      );
      if (DEBUG) log('debug-ответ', transactionId, await res.text());
      if (res.status >= 300) { status = `http_${res.status}`; failed++; }
      else sent++;
    } catch (e) {
      status = `err:${String(e).slice(0, 80)}`;
      failed++;
    }

    // Метим только успешные — неуспешные переотправятся следующим прогоном.
    // В --debug не метим никогда: debug-эндпоинт только валидирует payload, событие
    // в отчёты не попадает. Иначе один отладочный прогон навсегда съел бы оплату.
    if (status === 'ok' && !DEBUG) {
      await c.query(
        `INSERT INTO ga_mp_sent(branch, payment_id, crm_id, ga_client_id, value, status)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
        [r.branch, r.id, r.customer_id, r.ga_client_id, value, status],
      );
    } else {
      log('ошибка отправки', transactionId, status);
    }
  }

  log(`отправлено: ${sent}, ошибок: ${failed}`);
  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
