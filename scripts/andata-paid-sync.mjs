#!/usr/bin/env node
/**
 * andata-paid-sync — отправляет событие order_paid в Andata при новых оплатах в AlfaCRM.
 *
 * Логика:
 *   1. Авторизация в AlfaCRM, опрос pay/index (новые оплаты с момента прошлого запуска).
 *   2. Фильтр: только Доход (pay_type_id=1) с привязкой к клиенту (customer_id != null).
 *   3. По customer_id берём клиента (customer/index) → телефон, dob (возраст),
 *      e-mail и кастомные поля визита (ubtcuid / domain_userid / ym_uid).
 *   4. POST order_paid на https://mdeploy.andata.ru/api2.php.
 *   5. Состояние (последний обработанный pay.id) храним в JSON-файле.
 *
 * Первый запуск без state-файла НЕ рассылает исторические оплаты — только фиксирует
 * baseline (текущий max pay.id), события идут со следующих новых оплат.
 *
 * ENV:
 *   ALFACRM_HOSTNAME, ALFACRM_EMAIL, ALFACRM_API_KEY          — доступ к AlfaCRM (обяз.)
 *   ALFACRM_BRANCH=5                                          — филиал (лагерь)
 *   ALFACRM_FIELD_UBTCUID / _DOMAINID / _YMUID                — коды кастомных полей клиента
 *   ANDATA_STATE_FILE=/var/www/aidacamp-dev/leads/andata-paid-state.json
 *   ANDATA_SOURCE_PAID=alfacrm                                — event_source
 *
 * Флаги: --dry-run (не постить в Andata, не менять state), --verbose
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const ANDATA_ENDPOINT = 'https://mdeploy.andata.ru/api2.php';
const ANDATA_CONTAINER_ID = '9c0aaeb2-3b5c-4f86-aebd-786c79f7314b';
const TAG_ORDER_PAID = 'a1d33586-42a1-4c1b-9e9a-68b768180049';
const PAY_TYPE_INCOME = 1; // 1=Доход, 7=Расход

const DRY = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const HOST = process.env.ALFACRM_HOSTNAME;
const EMAIL = process.env.ALFACRM_EMAIL;
const API_KEY = process.env.ALFACRM_API_KEY;
const BRANCH = process.env.ALFACRM_BRANCH || '5';
const F_UBT = process.env.ALFACRM_FIELD_UBTCUID || '';
const F_DOM = process.env.ALFACRM_FIELD_DOMAINID || '';
const F_YM = process.env.ALFACRM_FIELD_YMUID || '';
const STATE_FILE =
  process.env.ANDATA_STATE_FILE || '/var/www/aidacamp-dev/leads/andata-paid-state.json';
const SOURCE = process.env.ANDATA_SOURCE_PAID || 'alfacrm';

const log = (...a) => console.log(new Date().toISOString(), ...a);
const vlog = (...a) => VERBOSE && log(...a);

function die(msg) {
  console.error(new Date().toISOString(), 'FATAL:', msg);
  process.exit(1);
}

/** ISO 8601 UTC0 без миллисекунд */
function isoUtc(d = new Date()) {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** created_at AlfaCRM ("2026-05-22 12:28:55", МСК UTC+3) → ISO UTC0 */
function payDateToIso(s) {
  if (!s) return isoUtc();
  const iso = String(s).trim().replace(' ', 'T') + '+03:00';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? isoUtc() : isoUtc(d);
}

/** dob "DD.MM.YYYY" → возраст в полных годах (строкой) или undefined */
function ageFromDob(dob) {
  if (!dob) return undefined;
  const m = String(dob).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  const birth = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const md = now.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age--;
  return age >= 0 && age < 120 ? String(age) : undefined;
}

const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '');

async function alfaPost(token, path, payload) {
  const res = await fetch(`https://${HOST}/v2api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function auth() {
  const res = await fetch(`https://${HOST}/v2api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, api_key: API_KEY }),
  });
  const j = await res.json();
  if (!j?.token) die('AlfaCRM auth failed');
  return j.token;
}

/** Все новые оплаты-доходы с id > lastId (по убыванию id, с пагинацией) */
async function fetchNewPays(token, lastId) {
  const result = [];
  let maxId = lastId;
  for (let page = 0; page < 50; page++) {
    const d = await alfaPost(token, `${BRANCH}/pay/index`, { page });
    const items = d?.items || [];
    if (!items.length) break;
    for (const p of items) {
      if (p.id > maxId) maxId = p.id;
      if (p.id <= lastId) return { pays: result, maxId };
      if (p.pay_type_id === PAY_TYPE_INCOME && p.customer_id) result.push(p);
    }
    if (items.length < 50) break; // последняя страница
  }
  return { pays: result, maxId };
}

/**
 * Карточка клиента по id. Фильтр {id} по умолчанию не находит архивные карточки
 * (та же грабля, что чинили в src/lib/alfaCustomerNote.ts 01.08.2026: {id:445} → 0
 * записей, {id:445, removed:1} → 1) — делаем ретрай перед тем, как сдаться.
 * null на выходе — «не нашли ни одним фильтром/сеть упала», не «клиента нет» —
 * вызывающий код обязан залогировать это как деградацию данных, а не молчать.
 */
async function fetchCustomer(token, id) {
  const direct = await alfaPost(token, `${BRANCH}/customer/index`, { id, page: 0 });
  if (direct?.items?.[0]) return direct.items[0];
  const archived = await alfaPost(token, `${BRANCH}/customer/index`, { id, page: 0, removed: 1 });
  return archived?.items?.[0] || null;
}

async function sendAndataPaid(pay, customer) {
  const ubtcuid = (F_UBT && customer?.[F_UBT]) || 'none';
  const domainid = (F_DOM && customer?.[F_DOM]) || 'none';
  const ymUid = (F_YM && customer?.[F_YM]) || '';
  const phone = onlyDigits(Array.isArray(customer?.phone) ? customer.phone[0] : customer?.phone);
  const email = Array.isArray(customer?.email) ? customer.email[0] : customer?.email;
  const orderValue = Math.round(Number(pay.income));

  const eventData = {
    order_id: String(pay.id),
    order_date_create: payDateToIso(pay.created_at),
  };
  const age = ageFromDob(customer?.dob);
  if (age) eventData.age_child = age;
  if (!Number.isNaN(orderValue)) eventData.order_value = orderValue;
  if (phone) eventData.input_phone = phone;
  if (email) eventData.input_email = email;
  if (ymUid) eventData.ym_uid = ymUid;

  const payload = {
    container_id: ANDATA_CONTAINER_ID,
    event_ubtcuid: ubtcuid,
    event_domainid: domainid,
    event_source: SOURCE,
    event_datetime: isoUtc(),
    event_name: 'order_paid',
    tag_id: TAG_ORDER_PAID,
    event_data: eventData,
  };

  if (DRY) {
    log('[dry-run] order_paid →', JSON.stringify(payload));
    return true;
  }
  const res = await fetch(ANDATA_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(payload),
  });
  const out = await res.json().catch(() => null);
  const ok = out?.status === 'success';
  if (!ok) log('Andata error for pay', pay.id, JSON.stringify(out));
  return ok;
}

async function loadState() {
  try {
    return JSON.parse(await readFile(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

async function saveState(state) {
  if (DRY) return;
  await mkdir(dirname(STATE_FILE), { recursive: true });
  await writeFile(STATE_FILE, JSON.stringify(state), 'utf8');
}

async function main() {
  if (!HOST || !EMAIL || !API_KEY) die('ALFACRM_HOSTNAME/EMAIL/API_KEY not set');
  if (!F_UBT && !F_DOM && !F_YM) {
    log('WARN: ALFACRM_FIELD_* не заданы — события уйдут с ubtcuid/domainid="none" (без матчинга визита)');
  }

  const token = await auth();
  const state = await loadState();

  // Baseline на первом запуске: не рассылаем историю
  if (!state || typeof state.lastPayId !== 'number') {
    const { maxId } = await fetchNewPays(token, -1); // соберём текущий максимум id
    await saveState({ lastPayId: maxId, baselineAt: isoUtc() });
    log(`baseline установлен: lastPayId=${maxId}, история не рассылается`);
    return;
  }

  const { pays, maxId } = await fetchNewPays(token, state.lastPayId);
  vlog(`новых оплат-доходов: ${pays.length}, lastPayId ${state.lastPayId} → ${maxId}`);

  // обрабатываем от старых к новым
  pays.sort((a, b) => a.id - b.id);
  let sent = 0;
  for (const pay of pays) {
    const customer = await fetchCustomer(token, pay.customer_id);
    if (!customer) {
      // Не пропускаем оплату целиком (Andata всё равно полезна с order_id/сумма),
      // но фиксируем деградацию — иначе тихо теряем ubtcuid/phone/email/age
      // и никто не узнает, почему матчинг визита не сработал именно для этой оплаты.
      log(`WARN: карточка клиента ${pay.customer_id} (оплата ${pay.id}) не прочиталась — событие уйдёт без телефона/email/возраста/ubtcuid`);
    }
    const ok = await sendAndataPaid(pay, customer);
    if (ok) sent++;
  }

  await saveState({ lastPayId: maxId, updatedAt: isoUtc() });
  log(`готово: обработано ${pays.length}, отправлено ${sent}, lastPayId=${maxId}${DRY ? ' (dry-run)' : ''}`);
}

main().catch((e) => die(e?.stack || String(e)));
