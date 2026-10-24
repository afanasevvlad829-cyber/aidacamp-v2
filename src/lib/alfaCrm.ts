// Лёгкий клиент Альфа-CRM для SSR-страниц.
// Кеш токена в памяти процесса до 50 минут.

import { fetchWithTimeout } from './fetchWithTimeout';
import { PAMYATKA_SHIFTS } from '../data/pamyatkaShifts';

// Таймаут на все запросы к AlfaCRM: зависший CRM не должен вешать SSR/приём заявки.
const ALFA_TIMEOUT_MS = 8000;

const BRANCH = 5;

let _tokenCache: { token: string; exp: number } | null = null;

async function authToken(): Promise<string | null> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.exp > now) return _tokenCache.token;

  const host = process.env.ALFACRM_HOSTNAME;
  const email = process.env.ALFACRM_EMAIL;
  const apiKey = process.env.ALFACRM_API_KEY;
  if (!host || !email || !apiKey) return null;

  try {
    const r = await fetchWithTimeout(`https://${host}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    }, ALFA_TIMEOUT_MS);
    const j: any = await r.json();
    if (!j?.token) return null;
    _tokenCache = { token: j.token, exp: now + 50 * 60 * 1000 };
    return j.token;
  } catch {
    return null;
  }
}

/** Достаёт TG и Max ссылки из поля note группы (формат: "https://t.me/... / https://max.ru/...") */
export async function getGroupLinks(groupId: number): Promise<{ tg?: string; max?: string }> {
  const host = process.env.ALFACRM_HOSTNAME;
  const token = await authToken();
  if (!host || !token) return {};

  try {
    const r = await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/group/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: groupId, page: 0 }),
    }, ALFA_TIMEOUT_MS);
    const j: any = await r.json();
    const note: string = j?.items?.[0]?.note ?? '';
    if (!note) return {};

    const tgMatch = note.match(/https?:\/\/t\.me\/[^\s/]+/);
    const maxMatch = note.match(/https?:\/\/max\.ru\/[^\s]+/);
    return {
      tg: tgMatch?.[0],
      max: maxMatch?.[0],
    };
  } catch {
    return {};
  }
}

export async function getCustomerGroupIds(customerId: number): Promise<number[]> {
  return findCustomerGroups(customerId, Object.keys(PAMYATKA_SHIFTS).map(Number));
}

/**
 * Ищем группы клиента ОБРАТНЫМ запросом: спрашиваем состав каждой группы-кандидата
 * и смотрим, есть ли там наш клиент.
 *
 * Прямой путь не работает: `customer/index` по `{id}` отдаёт карточку БЕЗ полей
 * `group_ids`/`groups`/`customer_groups` (проверено на проде 01.08.2026), а
 * запасной `customer-group/index` в этой CRM отвечает 404. Из-за этого функция
 * всегда возвращала [] и блок смены на /p/<id> не показывался вообще никому.
 *
 * Состав группы кешируем на 5 минут: иначе на каждый SSR-рендер уходило бы
 * по запросу на каждую смену.
 */
const _groupMembers = new Map<number, { ids: Set<number>; exp: number }>();
const GROUP_TTL_MS = 5 * 60 * 1000;

async function groupMemberIds(groupId: number): Promise<Set<number> | null> {
  const cached = _groupMembers.get(groupId);
  if (cached && cached.exp > Date.now()) return cached.ids;

  const host = process.env.ALFACRM_HOSTNAME;
  const token = await authToken();
  if (!host || !token) return null;

  const ids = new Set<number>();
  try {
    for (let page = 0; page < 10; page++) {
      const r = await fetchWithTimeout(`https://${host}/v2api/${BRANCH}/customer/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
        // removed:1 — иначе архивные карточки не видны (та же грабля, что с {id})
        body: JSON.stringify({ group_id: groupId, page, removed: 1 }),
      }, ALFA_TIMEOUT_MS);
      const j: any = await r.json();
      const items = j?.items || [];
      if (!items.length) break;
      for (const c of items) if (typeof c?.id === 'number') ids.add(c.id);
    }
  } catch {
    // Не удалось узнать состав — это НЕ «группа пустая». Не кешируем и не врём.
    return null;
  }

  _groupMembers.set(groupId, { ids, exp: Date.now() + GROUP_TTL_MS });
  return ids;
}

async function findCustomerGroups(customerId: number, candidates: number[]): Promise<number[]> {
  const found: number[] = [];
  for (const gid of candidates) {
    const members = await groupMemberIds(gid);
    if (members?.has(customerId)) found.push(gid);
  }
  return found;
}
