declare global {
  interface Window {
    Snowplow?: { getTrackerCf?: () => { getDomainUserId?: () => string } };
    // window.ym уже объявлен глобально в src/env.d.ts — не переобъявляем (иначе ts(2717)).
  }
}

export interface ClientData {
  referrer?: string;
  utm?: Record<string, string>;
  screen_w?: number;
  screen_h?: number;
  lang?: string;
  tz?: string;
  ym_uid_cookie?: string;
  ym_first_visit?: string;
  vk_vid?: string;
  ubtcuid?: string;
  domain_userid?: string;
  /** GA4 client_id из куки `_ga` — второй идентификатор визита рядом с ym */
  ga_client_id?: string;
  ga_first_visit?: string;
  gclid?: string;
}

/** Собираем максимум атрибуции о браузере клиента — реферер, UTM, экран, таймзона, куки Метрики/VK/Andata. */
export function collectClientData(): ClientData {
  const data: ClientData = {};
  try {
    data.referrer = document.referrer || '';
    const sp = new URLSearchParams(location.search);
    const utm: Record<string, string> = {};
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (sp.has(k)) utm[k] = sp.get(k)!;
    }
    if (Object.keys(utm).length) data.utm = utm;

    if (window.screen) {
      data.screen_w = window.screen.width;
      data.screen_h = window.screen.height;
    }
    data.lang = navigator.language || '';

    try {
      data.tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      /* noop */
    }

    const ymUidMatch = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
    if (ymUidMatch) data.ym_uid_cookie = ymUidMatch[1];
    const ymDMatch = document.cookie.match(/(?:^|;\s*)_ym_d=([^;]+)/);
    if (ymDMatch) {
      const ts = parseInt(ymDMatch[1], 10);
      if (ts > 1000000000) data.ym_first_visit = new Date(ts * 1000).toISOString().slice(0, 10);
    }

    const vkMatch = document.cookie.match(/(?:^|;\s*)vk_top_vid=([^;]+)/);
    if (vkMatch) data.vk_vid = vkMatch[1];

    // Google Analytics — второй независимый идентификатор визита рядом с ym.
    // Куки `_ga` = GA1.<depth>.<random>.<ts>; client_id для GA4 — ОБА последних
    // сегмента («<random>.<ts>»), не только первый: Measurement Protocol не примет
    // усечённый id. Хвост <ts> — unix-время первого визита.
    const gaMatch = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    if (gaMatch) {
      data.ga_client_id = gaMatch[1];
      const gaTs = parseInt(gaMatch[1].split('.')[1], 10);
      if (gaTs > 1000000000) data.ga_first_visit = new Date(gaTs * 1000).toISOString().slice(0, 10);
    }

    // gclid — из URL, иначе из сохранённой атрибуции формы (STORAGE_KEYS.attribution)
    let gclid = sp.get('gclid') || '';
    if (!gclid) {
      try {
        gclid = (JSON.parse(localStorage.getItem('ac_attribution') || '{}') as { gclid?: string }).gclid || '';
      } catch {
        /* noop */
      }
    }
    if (gclid) data.gclid = gclid;

    const ubtMatch = document.cookie.match(/(?:^|;\s*)ubtcuid=([^;]+)/);
    if (ubtMatch) data.ubtcuid = decodeURIComponent(ubtMatch[1]);
    try {
      const did = window.Snowplow?.getTrackerCf?.()?.getDomainUserId?.();
      if (did) data.domain_userid = String(did);
    } catch {
      /* noop */
    }
    if (!data.domain_userid) {
      const spId = document.cookie
        .split(';')
        .map((s) => s.trim())
        .find((s) => s.indexOf('_sp_id.') === 0);
      if (spId) data.domain_userid = spId.slice(spId.indexOf('=') + 1).split('.')[0] || '';
    }
  } catch {
    /* noop */
  }
  return data;
}

export interface BindContext {
  lid: number;
  t: string;
  isPreview: boolean;
  isManagerBrowser: boolean;
  /** sessionStorage-ключ дедупликации, напр. 'pm_bound_' + lid или 'foto_bound_' + shiftId + '_' + lid */
  storageKey: string;
}

/** Отправляет ym_client_id + собранную атрибуцию на /api/bind-lead. Менеджерские визиты логируются, но не дедупятся в sessionStorage. */
export function bindCid(cid: string, ctx: BindContext): void {
  if (!cid) return;
  const extra = collectClientData();
  // Гард с отметкой «был ли ga_client_id»: GA грузится асинхронно, на 1,5-й секунде
  // куки `_ga` может ещё не быть. Повторно шлём ровно один раз — когда она появилась.
  const mark = `${cid}|${extra.ga_client_id ? '1' : '0'}`;
  if (!ctx.isManagerBrowser) {
    const prev = sessionStorage.getItem(ctx.storageKey);
    if (prev === mark || prev === `${cid}|1`) return;
  }
  fetch('/api/bind-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lid: ctx.lid,
      t: ctx.t,
      ym_client_id: String(cid),
      is_manager: ctx.isManagerBrowser,
      ...extra,
    }),
  })
    .then((r) => r.json())
    .then((j) => {
      if (j && j.ok && !ctx.isManagerBrowser) sessionStorage.setItem(ctx.storageKey, mark);
    })
    .catch(() => {});
}

/** Метрика и GA грузятся асинхронно — 3 попытки биндинга с задержкой. Ничего не делает в preview. */
export function scheduleBind(ctx: BindContext, ymCounterId: number): void {
  if (ctx.isPreview) return;
  const tryBind = () => {
    try {
      if (window.ym) {
        window.ym(ymCounterId, 'getClientID', (cid: string) => bindCid(cid, ctx));
      }
      const m = document.cookie.match(/(?:^|;\s*)_ym_uid=([^;]+)/);
      if (m && m[1]) setTimeout(() => bindCid(m[1], ctx), 1500);
    } catch {
      /* noop */
    }
  };
  setTimeout(tryBind, 1500);
  setTimeout(tryBind, 4500);
  // Третья попытка — страховка для медленных сетей: к ней куки `_ga` есть точно.
  setTimeout(tryBind, 9000);
}
