// Чтение и безопасное дописывание примечания (note) карточки клиента AlfaCRM.
//
// ⚠️ Почему отдельный модуль, а не пара функций в API-роуте:
// AlfaCRM умеет только перезаписывать note целиком (`customer/update` с полным
// текстом). Значит любая запись — это read-modify-write, и если чтение молча
// вернуло пустую строку, запись СТИРАЕТ всё, что было в карточке.
//
// Инцидент 01.08.2026: карточка 445 потеряла 104 символа (tg_peer_id,
// идентификатор, ссылка-памятка) при заходе родителя на /p/<crm_id> —
// getCustomerNote вернул '' вместо реального текста, и append превратился
// в перезапись. Восстановлено вручную из снимка.
//
// Здесь два лекарства:
//   1. fail-safe: «прочитать не удалось» (null) строго отличается от
//      «примечание реально пустое» (''); при null запись не выполняется вообще;
//   2. фолбэк на дефект API: `customer/index` с фильтром {id} по умолчанию
//      отсекает архивные карточки и отдаёт 0 записей (проверено на проде
//      01.08.2026: #445 — 0 записей, она же с {removed:1} — 1 запись;
//      контрольная неархивная #5045 находится обоими способами).
//      Поэтому при пустом ответе делаем один ретрай с {removed:1}.

import { fetchWithTimeout } from './fetchWithTimeout';

const BRANCH = 5;

/** Сигнатура fetchWithTimeout — для подмены в тестах. */
export type FetchLike = typeof fetchWithTimeout;

export type CustomerRecord = Record<string, unknown>;

/** Результат попытки дописать примечание. */
export type NoteAppendResult =
  | 'ok'           // прочитали и записали
  | 'read_failed'  // не прочитали → НИЧЕГО не писали (данные целы)
  | 'write_failed'; // прочитали, но запись не прошла

async function requestCustomer(
  host: string,
  token: string,
  id: number,
  filter: Record<string, unknown>,
  fetchFn: FetchLike,
): Promise<CustomerRecord | null> {
  const r = await fetchFn(`https://${host}/v2api/${BRANCH}/customer/index`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
    body: JSON.stringify({ id, ...filter }),
  });
  const j = await r.json() as { items?: unknown };
  const item = Array.isArray(j?.items) ? j.items[0] : undefined;
  return (item && typeof item === 'object') ? item as CustomerRecord : null;
}

/**
 * Полная карточка клиента.
 * @returns запись карточки либо `null` — «прочитать НЕ удалось».
 *
 * `null` означает именно неудачу чтения (сбой сети/тайм-аут/битый ответ/карточка
 * не найдена ни одним фильтром), а не «карточка пустая». Вызывающий код обязан
 * трактовать `null` как «данных нет — ничего не перезаписываем».
 */
export async function fetchCustomer(
  host: string,
  token: string,
  id: number,
  fetchFn: FetchLike = fetchWithTimeout,
): Promise<CustomerRecord | null> {
  try {
    const direct = await requestCustomer(host, token, id, {}, fetchFn);
    if (direct) return direct;
    // Пустой ответ — не «нет карточки», а известный дефект фильтра по id
    // на архивных карточках. Один ретрай с removed:1 (он возвращает и
    // архивные, и обычные), дальше сдаёмся.
    const archived = await requestCustomer(host, token, id, { removed: 1 }, fetchFn);
    if (!archived) console.error(`[alfaCustomerNote] fetchCustomer(${id}): карточка не найдена ни обычным фильтром, ни с removed:1`);
    return archived;
  } catch (e) {
    console.error(`[alfaCustomerNote] fetchCustomer(${id}): запрос упал —`, e);
    return null;
  }
}

/**
 * Текущее примечание карточки.
 * @returns строку (в т.ч. пустую — примечание реально пустое) либо `null`,
 *          если карточку прочитать не удалось.
 */
export function readNote(cust: CustomerRecord | null): string | null {
  if (!cust) return null;
  const note = cust.note;
  if (typeof note === 'string') return note;
  // note может прийти null/undefined — это валидная «пустая» карточка.
  return note == null ? '' : String(note);
}

async function writeNote(
  host: string,
  token: string,
  id: number,
  note: string,
  fetchFn: FetchLike,
): Promise<boolean> {
  try {
    const r = await fetchFn(`https://${host}/v2api/${BRANCH}/customer/update?id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id, note }),
    });
    const j = await r.json() as { errors?: unknown } | null;
    if (!j || j.errors) {
      console.error(`[alfaCustomerNote] writeNote(${id}): AlfaCRM отклонила запись —`, j?.errors ?? j);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[alfaCustomerNote] writeNote(${id}): запрос упал —`, e);
    return false;
  }
}

/**
 * Дописывает строку в конец примечания карточки, НИКОГДА не перезаписывая
 * существующий текст вслепую.
 *
 * Если прочитать текущее примечание не удалось — запись не выполняется вообще
 * ('read_failed'). Лучше потерять одну строку лога, чем содержимое карточки.
 */
export async function appendCustomerNote(
  host: string,
  token: string,
  id: number,
  line: string,
  fetchFn: FetchLike = fetchWithTimeout,
): Promise<NoteAppendResult> {
  const current = readNote(await fetchCustomer(host, token, id, fetchFn));
  if (current === null) {
    // fetchCustomer уже залогировал причину — здесь фиксируем сам факт отказа от записи.
    console.error(`[alfaCustomerNote] appendCustomerNote(${id}): чтение не удалось — строка НЕ дописана, карточка не тронута`);
    return 'read_failed';
  }
  const ok = await writeNote(host, token, id, current + line, fetchFn);
  return ok ? 'ok' : 'write_failed';
}
