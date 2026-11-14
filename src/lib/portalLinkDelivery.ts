/**
 * Доставка ПОСТОЯННОЙ ссылки входа (/s/<link_token>, многоразовая) сотруднику в Telegram через Green API.
 *
 * Источник отправки — Telegram-инстанс школы (GREENAPI_SCHOOL_INSTANCE_ID / GREENAPI_SCHOOL_TOKEN,
 * хост GREENAPI_SCHOOL_HOST, по умолчанию https://api.greenapi.com). Ключи — только из окружения.
 *
 * chatId для Telegram-инстанса (документация Green API, SendMessage):
 *   «79876543210@c.us» — по телефону, «@username» — по нику, «10000000» — по числовому id.
 *
 * Логика вынесена в deliverStaffLink(deps): всё внешнее (БД, токен ссылки, HTTP) подаётся снаружи,
 * поэтому тестируется без сети и без БД. Автоповторов нет: повтор — только кнопкой «Отправить заново».
 */
import { query, withDbClient } from './db';
import { getOrCreateLinkToken } from './portalStaff';

export type DeliveryStatus = 'queued' | 'sent' | 'failed';

export interface TgTarget {
  kind: 'phone' | 'username' | 'tg_id';
  chatId: string;
}

/** Телефон → 7XXXXXXXXXX (РФ) или международные цифры 11–15; иначе null. */
export function normalizePhone(raw: string | null | undefined): string | null {
  let d = String(raw ?? '').replace(/[^\d]/g, '');
  if (!d) return null;
  if (d.length === 11 && d.startsWith('8')) d = '7' + d.slice(1);
  else if (d.length === 10 && d.startsWith('9')) d = '7' + d;
  if (d.length < 11 || d.length > 15) return null;
  return d;
}

/** @username / t.me/username → «username» (5–32 символа, латиница/цифры/_), иначе null. */
export function normalizeUsername(raw: string | null | undefined): string | null {
  let s = String(raw ?? '').trim();
  s = s.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '');
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(s) ? s : null;
}

export interface StaffContact {
  phone?: string | null;
  tg_username?: string | null;
  telegram_id?: number | null;
}

/** Выбор адресата: телефон → ник → числовой telegram_id. null, если ничего валидного. */
export function resolveTarget(c: StaffContact): TgTarget | null {
  const phone = normalizePhone(c.phone);
  if (phone) return { kind: 'phone', chatId: `${phone}@c.us` };
  const u = normalizeUsername(c.tg_username);
  if (u) return { kind: 'username', chatId: `@${u}` };
  if (c.telegram_id && Number.isFinite(c.telegram_id) && c.telegram_id > 0) {
    return { kind: 'tg_id', chatId: String(c.telegram_id) };
  }
  return null;
}

export function buildLinkMessage(name: string | null, url: string): string {
  const hello = name ? `Здравствуйте, ${name}!` : 'Здравствуйте!';
  return `${hello} Это ваша личная ссылка для входа в портал АйДаКемп, она постоянная — сохраните её:\n${url}`;
}

export interface StaffForDelivery extends StaffContact {
  id: number;
  full_name: string | null;
  roles: string[];
}

export interface DeliveryDeps {
  loadStaff(id: number): Promise<StaffForDelivery | null>;
  /** Постоянный токен ссылки; rotate=true выпускает новый (старая ссылка перестаёт работать). */
  getLinkToken(staffId: number, rotate: boolean): Promise<string | null>;
  insertDelivery(p: { staff_id: number; target: string; status: DeliveryStatus; error?: string | null }): Promise<number>;
  updateDelivery(id: number, p: { status: DeliveryStatus; error?: string | null; message_id?: string | null }): Promise<void>;
  send(chatId: string, text: string): Promise<{ idMessage: string | null }>;
}

export type DeliveryResult =
  | { ok: true; status: 'sent'; deliveryId: number }
  | { ok: false; status: 'failed'; error: string; deliveryId: number | null };

/** Приводит любую ошибку к короткой строке без секретов (токен в URL не светим). */
export function safeError(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  return m.replace(/\/[A-Za-z0-9_.-]{20,}/g, '/***').slice(0, 300);
}

export async function deliverStaffLink(
  staffId: number,
  opts: { baseUrl: string; rotate?: boolean },
  deps: DeliveryDeps,
): Promise<DeliveryResult> {
  const staff = await deps.loadStaff(staffId);
  if (!staff) return { ok: false, status: 'failed', error: 'Сотрудник не найден', deliveryId: null };

  const raw = staff.phone || staff.tg_username || String(staff.telegram_id ?? '');
  const target = resolveTarget(staff);
  if (!target) {
    // Валидация ДО отправки и до выдачи ссылки.
    const id = await deps.insertDelivery({
      staff_id: staffId, target: raw || '—', status: 'failed',
      error: 'Нет корректного телефона или @username',
    });
    return { ok: false, status: 'failed', error: 'Нет корректного телефона или @username', deliveryId: id };
  }
  if (!staff.roles?.length) {
    const id = await deps.insertDelivery({ staff_id: staffId, target: target.chatId, status: 'failed', error: 'У сотрудника нет ролей' });
    return { ok: false, status: 'failed', error: 'У сотрудника нет ролей', deliveryId: id };
  }

  const linkToken = await deps.getLinkToken(staffId, opts.rotate === true);
  if (!linkToken) {
    const id = await deps.insertDelivery({ staff_id: staffId, target: target.chatId, status: 'failed', error: 'Не удалось выдать ссылку' });
    return { ok: false, status: 'failed', error: 'Не удалось выдать ссылку', deliveryId: id };
  }

  const deliveryId = await deps.insertDelivery({ staff_id: staffId, target: target.chatId, status: 'queued' });
  const url = `${opts.baseUrl.replace(/\/+$/, '')}/s/${linkToken}`;
  try {
    const r = await deps.send(target.chatId, buildLinkMessage(staff.full_name, url));
    await deps.updateDelivery(deliveryId, { status: 'sent', message_id: r.idMessage });
    return { ok: true, status: 'sent', deliveryId };
  } catch (e) {
    const error = safeError(e);
    await deps.updateDelivery(deliveryId, { status: 'failed', error });
    return { ok: false, status: 'failed', error, deliveryId };
  }
}

/** Пачка: пауза между отправками (Green API лимитирует частоту). Последовательно. */
export async function deliverBatch(
  ids: number[],
  opts: { baseUrl: string; pauseMs?: number; sleep?: (ms: number) => Promise<void> },
  deps: DeliveryDeps,
): Promise<DeliveryResult[]> {
  const pause = opts.pauseMs ?? 4000;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const out: DeliveryResult[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (i > 0) await sleep(pause);
    out.push(await deliverStaffLink(ids[i], opts, deps));
  }
  return out;
}

// ─── Реальные зависимости (БД + Green API) ──────────────────────────────────

export function greenApiSend(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch) {
  return async (chatId: string, text: string): Promise<{ idMessage: string | null }> => {
    const id = env.GREENAPI_SCHOOL_INSTANCE_ID;
    const token = env.GREENAPI_SCHOOL_TOKEN;
    if (!id || !token) throw new Error('Green API школы не настроен (GREENAPI_SCHOOL_*)');
    const host = (env.GREENAPI_SCHOOL_HOST || 'https://api.greenapi.com').replace(/\/+$/, '');
    const res = await fetchImpl(`${host}/waInstance${id}/sendMessage/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message: text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`Green API HTTP ${res.status}`);
    const j: any = await res.json().catch(() => ({}));
    return { idMessage: j?.idMessage ? String(j.idMessage) : null };
  };
}

export const dbDeps: DeliveryDeps = {
  async loadStaff(id) {
    const r = await query<any>(
      `SELECT id, full_name, phone, tg_username, telegram_id, COALESCE(roles, ARRAY[]::TEXT[]) AS roles
         FROM portal_staff WHERE id=$1`, [id]);
    const s = r?.[0];
    return s ? { ...s, id: Number(s.id), telegram_id: s.telegram_id == null ? null : Number(s.telegram_id) } : null;
  },
  getLinkToken: (staffId, rotate) => getOrCreateLinkToken(staffId, rotate),
  async insertDelivery(p) {
    const r = await query<{ id: string }>(
      `INSERT INTO portal_link_delivery (staff_id, target, status, error)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [p.staff_id, p.target, p.status, p.error ?? null]);
    return Number(r?.[0]?.id ?? 0);
  },
  async updateDelivery(id, p) {
    await withDbClient((c) => c.query(
      `UPDATE portal_link_delivery
          SET status=$2, error=$3, message_id=COALESCE($4, message_id),
              sent_at = CASE WHEN $2='sent' THEN now() ELSE sent_at END
        WHERE id=$1`, [id, p.status, p.error ?? null, p.message_id ?? null]));
  },
  send: (chatId, text) => greenApiSend()(chatId, text),
};

export interface LastDelivery {
  staff_id: number;
  status: DeliveryStatus;
  error: string | null;
  target: string;
  created_at: string;
  sent_at: string | null;
}

/** Последняя доставка по каждому сотруднику (для списка). */
export async function lastDeliveries(): Promise<Map<number, LastDelivery>> {
  const rows = await query<any>(
    `SELECT DISTINCT ON (staff_id) staff_id, status, error, target,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
            to_char(sent_at,    'YYYY-MM-DD"T"HH24:MI:SSOF') AS sent_at
       FROM portal_link_delivery ORDER BY staff_id, created_at DESC, id DESC`);
  const m = new Map<number, LastDelivery>();
  for (const r of rows ?? []) m.set(Number(r.staff_id), { ...r, staff_id: Number(r.staff_id) });
  return m;
}
