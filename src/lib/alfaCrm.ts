// Лёгкий клиент Альфа-CRM для SSR-страниц.
// Кеш токена в памяти процесса до 50 минут.
//
// ⚠️ Правило модуля: чтение, которое не удалось (сеть/тайм-аут/битый ответ),
// логируется через console.error('[alfaCrm] ...') и НЕ маскируется под
// «данных нет». Мы не пишем в CRM отсюда, поэтому падать наружу не обязательно —
// но молчать нельзя: инцидент 01.08.2026 показал, что тихий catch{} без лога
// прятал сломанный запрос месяцами (getCustomerGroupIds не работал вообще).

import { fetchWithTimeout } from './fetchWithTimeout';
import { PAMYATKA_SHIFTS } from '../data/pamyatkaShifts';

// Таймаут на все запросы к AlfaCRM: зависший CRM не должен вешать SSR/приём заявки.
const ALFA_TIMEOUT_MS = 8000;

const BRANCH = 5;

/** Сигнатура fetchWithTimeout — для подмены в тестах. */
export type FetchLike = typeof fetchWithTimeout;

let _tokenCache: { token: string; exp: number } | null = null;

/** Только для тестов: сбрасывает кеш токена и состава групп между кейсами. */
export function resetAlfaCrmCacheForTests(): void {
  _tokenCache = null;
  _groupMembers.clear();
}

async function authToken(fetchFn: FetchLike = fetchWithTimeout): Promise<string | null> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.exp > now) return _tokenCache.token;

  const host = process.env.ALFACRM_HOSTNAME;
  const email = process.env.ALFACRM_EMAIL;
  const apiKey = process.env.ALFACRM_API_KEY;
  if (!host || !email || !apiKey) {
    console.error('[alfaCrm] auth: ALFACRM_HOSTNAME/EMAIL/API_KEY не заданы в env');
    return null;
  }

  try {
    const r = await fetchFn(`https://${host}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    }, ALFA_TIMEOUT_MS);
    const j: any = await r.json();
    if (!j?.token) {
      console.error('[alfaCrm] auth: логин не вернул token', j?.errors ?? j);
      return null;
    }
    _tokenCache = { token: j.token, exp: now + 50 * 60 * 1000 };
    return j.token;
  } catch (e) {
    console.error('[alfaCrm] auth: запрос упал —', e);
    return null;
  }
}

/** Достаёт TG и Max ссылки из поля note группы (формат: "https://t.me/... / https://max.ru/..."). */
export async function getGroupLinks(
  groupId: number,
  fetchFn: FetchLike = fetchWithTimeout,
): Promise<{ tg?: string; max?: string }> {
  const host = process.env.ALFACRM_HOSTNAME;
  const token = await authToken(fetchFn);
  if (!host || !token) return {};

  try {
    const r = await fetchFn(`https://${host}/v2api/${BRANCH}/group/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: groupId, page: 0 }),
    }, ALFA_TIMEOUT_MS);
    const j: any = await r.json();
    if (!Array.isArray(j?.items)) {
      console.error(`[alfaCrm] getGroupLinks(${groupId}): ответ без items —`, j?.errors ?? j);
      return {};
    }
    const note: string = j.items?.[0]?.note ?? '';
    if (!note) return {}; // группа найдена, note реально пуст — валидный «нет ссылок»

    const tgMatch = note.match(/https?:\/\/t\.me\/[^\s/]+/);
    const maxMatch = note.match(/https?:\/\/max\.ru\/[^\s]+/);
    return {
      tg: tgMatch?.[0],
      max: maxMatch?.[0],
    };
  } catch (e) {
    console.error(`[alfaCrm] getGroupLinks(${groupId}): запрос упал —`, e);
    return {};
  }
}

// ── Состав группы (обратный запрос) ─────────────────────────────────────────
//
// Прямой путь не работает: `customer/index` по `{id}` отдаёт карточку клиента
// БЕЗ полей `group_ids`/`groups`/`customer_groups` (проверено на проде
// 01.08.2026, клиент 5045 — все поля пустые), а запасной эндпоинт
// `customer-group/index` в этой CRM отвечает 404 — такого пути нет вообще.
// Из-за этого старая реализация getCustomerGroupIds ВСЕГДА возвращала [],
// и блок смены на /p/<id> не показывался никому и никогда.
//
// Рабочий способ — спросить у CRM состав каждой группы-кандидата
// (`customer/index` с `{group_id, removed:1, page}` — removed:1 обязателен,
// иначе архивные карточки не видны, та же грабля, что с {id}) и проверить,
// есть ли там наш клиент. Кандидаты — это group_id из PAMYATKA_SHIFTS
// (единственные группы, которые вообще нужны для памятки).

const _groupMembers = new Map<number, { ids: Set<number>; exp: number }>();
const GROUP_TTL_MS = 5 * 60 * 1000;

/**
 * Состав группы (id клиентов).
 * @returns Set id или null, если узнать НЕ удалось (сеть/тайм-аут/битый ответ).
 * `null` — это не «группа пустая», это «не спросили». Разделять их обязательно:
 * иначе SSR-рендер при сбое CRM решит, что клиент ни в одной группе не состоит.
 */
async function groupMemberIds(groupId: number, fetchFn: FetchLike): Promise<Set<number> | null> {
  const cached = _groupMembers.get(groupId);
  if (cached && cached.exp > Date.now()) return cached.ids;

  const host = process.env.ALFACRM_HOSTNAME;
  const token = await authToken(fetchFn);
  if (!host || !token) return null;

  const ids = new Set<number>();
  try {
    for (let page = 0; page < 10; page++) {
      const r = await fetchFn(`https://${host}/v2api/${BRANCH}/customer/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
        body: JSON.stringify({ group_id: groupId, page, removed: 1 }),
      }, ALFA_TIMEOUT_MS);
      const j: any = await r.json();
      if (!Array.isArray(j?.items)) {
        console.error(`[alfaCrm] groupMemberIds(${groupId}): ответ без items на page=${page} —`, j?.errors ?? j);
        return null;
      }
      if (!j.items.length) break;
      for (const c of j.items) if (typeof c?.id === 'number') ids.add(c.id);
    }
  } catch (e) {
    console.error(`[alfaCrm] groupMemberIds(${groupId}): запрос упал —`, e);
    return null;
  }

  _groupMembers.set(groupId, { ids, exp: Date.now() + GROUP_TTL_MS });
  return ids;
}

/**
 * Группы клиента среди кандидатов PAMYATKA_SHIFTS.
 * Best-effort по каждому кандидату: если состав одной группы не узнать —
 * логируем и пробуем остальные, а не бросаем всю функцию. Это чтение для
 * отображения (не запись), поэтому частичная деградация приемлема — но
 * должна быть видна в логах, а не тонуть в catch{}.
 */
export async function getCustomerGroupIds(
  customerId: number,
  fetchFn: FetchLike = fetchWithTimeout,
): Promise<number[]> {
  const candidates = Object.keys(PAMYATKA_SHIFTS).map(Number);
  const found: number[] = [];
  let failures = 0;

  for (const gid of candidates) {
    const members = await groupMemberIds(gid, fetchFn);
    if (members === null) {
      failures++;
      continue;
    }
    if (members.has(customerId)) found.push(gid);
  }

  if (failures === candidates.length && candidates.length > 0) {
    console.error(`[alfaCrm] getCustomerGroupIds(${customerId}): ни одна из ${candidates.length} групп не ответила — CRM недоступна`);
  } else if (failures > 0) {
    console.error(`[alfaCrm] getCustomerGroupIds(${customerId}): ${failures}/${candidates.length} групп не ответили, результат может быть неполным`);
  }

  return found;
}
