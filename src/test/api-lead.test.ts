/**
 * Тесты приёма заявок — src/pages/api/lead.ts.
 *
 * Почему они здесь, а не рядом с эндпоинтом: Astro считает роутом всё под
 * `src/pages`, и на билде пытается отрендерить тестовый файл, импортируя
 * vitest вне раннера. Инцидент 16.07.2026 (PR #952) уронил деплой и следом
 * два независимых PR, смерженных на уже сломанный dev.
 *
 * Что проверяем: критический путь заявки. Ошибка здесь — это потерянная
 * заявка, то есть прямые деньги. Внешние вызовы (AlfaCRM, Telegram, Andata)
 * замоканы; Postgres не трогается сам — без PG_DSN функции дедупа и лога
 * возвращаются раньше обращения к базе.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fetchWithTimeout = vi.fn();
vi.mock('../lib/fetchWithTimeout', () => ({ fetchWithTimeout: (...a: unknown[]) => fetchWithTimeout(...a) }));
vi.mock('../lib/andata', () => ({
  sendAndataEvent: vi.fn(async () => undefined),
  andataDatetime: () => '2026-09-08 12:00:00',
  andataPhone: (p: string) => p,
}));

const { POST } = await import('../pages/api/lead');

/** Ответ AlfaCRM/Telegram по умолчанию — успешный. */
function okResponse(body: unknown = { id: 12345 }) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) };
}

function request(body: Record<string, unknown>) {
  return new Request('https://aidacamp.ru/api/lead', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fetchWithTimeout.mockReset();
  fetchWithTimeout.mockResolvedValue(okResponse());
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token');
  vi.stubEnv('TELEGRAM_CHAT_ID', '-100500');
  // Без DSN дедуп и запись в PG выходят до обращения к базе — тесты не трогают Postgres.
  vi.stubEnv('AIDAPLUS_PG_DSN', '');
  vi.stubEnv('PG_DSN', '');
  // AlfaCRM должна быть «настроена», иначе createCrmLead выходит раньше вызова
  // и проверка «тестовый номер не идёт в CRM» стала бы зелёной при любой поломке.
  vi.stubEnv('ALFACRM_HOSTNAME', 'test.s20.online');
  vi.stubEnv('ALFACRM_EMAIL', 'test@example.com');
  vi.stubEnv('ALFACRM_API_KEY', 'test-key');
  vi.stubEnv('ALFACRM_BRANCH_ID', '1');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('POST /api/lead — валидация телефона', () => {
  it('отклоняет номер короче 10 цифр — иначе в CRM поедет мусор', async () => {
    const res = await POST({ request: request({ phone: '+7 999 12' }) } as never);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false, error: 'invalid_phone' });
  });

  it('отклоняет пустой телефон', async () => {
    const res = await POST({ request: request({ phone: '' }) } as never);
    expect(res.status).toBe(400);
  });

  it('принимает номер с любым форматированием — считаются только цифры', async () => {
    const res = await POST({ request: request({ phone: '+7 (968) 808-64-55', shift: '1 смена' }) } as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
});

describe('POST /api/lead — тестовые заявки', () => {
  it('обычный номер ИДЁТ в CRM — контроль, что проверка ниже не ложно-зелёная', async () => {
    await POST({ request: request({ phone: '+79688086455', shift: '1 смена' }) } as never);
    const urls = fetchWithTimeout.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('s20.online'))).toBe(true);
  });

  it('номер из диапазона +7999000XXXX не создаёт лид в CRM', async () => {
    // Удалить тестовый лид из AlfaCRM нельзя — customer/delete там нет
    // (проверено 28.08.2026), поэтому они не должны туда попадать вовсе.
    const res = await POST({ request: request({ phone: '+7 999 000 12 34' }) } as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, test: true });
    const urls = fetchWithTimeout.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes('s20.online'))).toBe(false);
  });

  it('form_id=health_smoke тоже помечается тестовой', async () => {
    const res = await POST({ request: request({ phone: '+79688086455', form_id: 'health_smoke' }) } as never);
    expect(await res.json()).toMatchObject({ ok: true, test: true });
  });
});

describe('POST /api/lead — устойчивость критического пути', () => {
  it('заявка принимается, даже если внешний вызов упал', async () => {
    // CRM и Telegram — best-effort: их падение не должно терять заявку.
    fetchWithTimeout.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await POST({ request: request({ phone: '+79688086455', shift: '2 смена' }) } as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('без токена Telegram отвечает 500 — заявку некуда доставить', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '');
    vi.stubEnv('TELEGRAM_CHAT_ID', '');
    const res = await POST({ request: request({ phone: '+79688086455' }) } as never);
    expect(res.status).toBe(500);
  });

  it('битый JSON не роняет эндпоинт', async () => {
    const bad = new Request('https://aidacamp.ru/api/lead', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{не json',
    });
    const res = await POST({ request: bad } as never);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false });
  });
});
