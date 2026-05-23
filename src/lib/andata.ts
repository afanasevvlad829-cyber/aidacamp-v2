/**
 * Andata — отправка событий в хранилище данных по API.
 * ТЗ: POST https://mdeploy.andata.ru/api2.php
 *
 * Используется на backend (/api/lead → order_new). Событие order_paid шлёт
 * отдельный серверный cron (scripts/andata-paid-sync.mjs) — он дублирует эту
 * логику, чтобы быть самодостаточным. При правках формата держать в синхроне.
 */

const ANDATA_ENDPOINT = 'https://mdeploy.andata.ru/api2.php';
const ANDATA_CONTAINER_ID = '9c0aaeb2-3b5c-4f86-aebd-786c79f7314b';
const ANDATA_TIMEOUT_MS = 3000;

/** tag_id событий из Andata Tag Manager (см. ТЗ) */
export const ANDATA_TAGS = {
  order_new: 'a1d3354b-eb9c-4c58-bb42-950dcdf78740',
  order_paid: 'a1d33586-42a1-4c1b-9e9a-68b768180049',
} as const;

export type AndataEventName = keyof typeof ANDATA_TAGS;

export interface AndataOrderData {
  /** id заявки/оплаты в CRM */
  order_id: string | number;
  /** дата создания, ISO 8601 UTC (YYYY-MM-DDTHH:MM:SSZ) */
  order_date_create: string;
  /** Сколько лет ребёнку */
  age_child?: string;
  /** сумма (для order_new — цена смены, для order_paid — сумма оплаты) */
  order_value?: number;
  /** только цифры, без +, скобок и пробелов */
  input_phone?: string;
  input_email?: string;
  /** cookie Яндекса (_ym_uid / clientID Метрики) */
  ym_uid?: string;
}

export interface SendAndataEventOptions {
  eventName: AndataEventName;
  /** Источник события: для order_new — наш backend, для order_paid — CRM */
  source: string;
  /** cookie ubtcuid (Andata). Отсутствует → 'none' */
  ubtcuid?: string | null;
  /** domain_userid (Snowplow). Отсутствует → 'none' */
  domainid?: string | null;
  data: AndataOrderData;
}

/** Дата-время в формате ISO 8601 UTC0 без миллисекунд: YYYY-MM-DDTHH:MM:SSZ */
export function andataDatetime(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Нормализует телефон: только цифры */
export function andataPhone(phone: unknown): string {
  return String(phone ?? '').replace(/\D/g, '');
}

/**
 * Отправляет событие в Andata. Best-effort: исключений не бросает,
 * возвращает true при status="success". Пустые идентификаторы → "none".
 */
export async function sendAndataEvent(opts: SendAndataEventOptions): Promise<boolean> {
  try {
    const d = opts.data;
    const eventData: Record<string, unknown> = {
      order_id: String(d.order_id),
      order_date_create: d.order_date_create,
    };
    if (d.age_child) eventData.age_child = d.age_child;
    if (typeof d.order_value === 'number' && !Number.isNaN(d.order_value)) {
      eventData.order_value = d.order_value;
    }
    if (d.input_phone) eventData.input_phone = d.input_phone;
    if (d.input_email) eventData.input_email = d.input_email;
    if (d.ym_uid) eventData.ym_uid = d.ym_uid;

    const payload = {
      container_id: ANDATA_CONTAINER_ID,
      event_ubtcuid: opts.ubtcuid || 'none',
      event_domainid: opts.domainid || 'none',
      event_source: opts.source,
      event_datetime: andataDatetime(),
      event_name: opts.eventName,
      tag_id: ANDATA_TAGS[opts.eventName],
      event_data: eventData,
    };

    // Жёсткий таймаут: Andata НИКОГДА не должна тормозить вызывающий код
    // (например, путь заявки /api/lead). При зависании — тихо выходим.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ANDATA_TIMEOUT_MS);
    try {
      const res = await fetch(ANDATA_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const out = (await res.json().catch(() => null)) as { status?: string } | null;
      return !!out && out.status === 'success';
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}
