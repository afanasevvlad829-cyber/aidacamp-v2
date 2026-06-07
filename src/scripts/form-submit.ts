import { MAILRU_PIXEL_ID, YM_COUNTER } from '../data/tracking';
import { STORAGE_KEYS } from '../lib/storage';

/** Читает _ym_uid из cookie как fallback для ym_client_id */
function getYmUidCookie(): string {
  try {
    const c = document.cookie.split(';').find((s) => s.trim().startsWith('_ym_uid='));
    return c ? c.trim().split('=')[1] : '';
  } catch {
    return '';
  }
}

/** ubtcuid — идентификатор трекинга Andata (cookie ubtcuid) */
function getUbtcuid(): string {
  try {
    const c = document.cookie.split(';').find((s) => s.trim().startsWith('ubtcuid='));
    return c ? decodeURIComponent(c.trim().slice('ubtcuid='.length)) : '';
  } catch {
    return '';
  }
}

/**
 * domain_userid Snowplow (Andata): сначала API трекера,
 * иначе из cookie _sp_id.<hash> — первый сегмент до точки.
 */
function getDomainUserId(): string {
  try {
    const sp = (window as any).Snowplow;
    const id = sp?.getTrackerCf?.()?.getDomainUserId?.();
    if (id) return String(id);
  } catch {
    /* ignore */
  }
  try {
    const c = document.cookie
      .split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith('_sp_id.'));
    if (c) return c.slice(c.indexOf('=') + 1).split('.')[0] || '';
  } catch {
    /* ignore */
  }
  return '';
}

/** Собирает контекст атрибуции и устройства */
function collectContext(): Record<string, string> {
  const qs = new URLSearchParams(window.location.search);
  const pick = (k: string) => qs.get(k) || '';

  // UTM: если в URL есть — сохраняем в sessionStorage; иначе берём сохранённые
  const stored: Record<string, string> = JSON.parse(
    sessionStorage.getItem(STORAGE_KEYS.attribution) || '{}'
  );
  const currentUtm: Record<string, string> = {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    utm_term: pick('utm_term'),
    yclid: pick('yclid'),
    ysclid: pick('ysclid'),
    gclid: pick('gclid'),
  };
  if (Object.values(currentUtm).some(Boolean)) {
    sessionStorage.setItem(STORAGE_KEYS.attribution, JSON.stringify(currentUtm));
  }
  const attr = Object.values(currentUtm).some(Boolean) ? currentUtm : stored;

  // ym_client_id: сначала Metrika API, fallback — cookie
  let ym_client_id = '';
  try {
    const ym = (window as any).ym;
    if (typeof ym === 'function') {
      ym(YM_COUNTER, 'getClientID', (id: string) => {
        ym_client_id = id || '';
      });
    }
  } catch {
    /* ignore */
  }
  if (!ym_client_id) ym_client_id = getYmUidCookie();

  // session_ms — время с первого открытия любой страницы сайта в сессии.
  // ac_session_start ставится в Base.astro inline-скриптом ПРИ ЗАГРУЗКЕ страницы,
  // а не здесь — иначе на первом сабмите всегда будет 0 (start пишется одновременно с измерением).
  // Резерв: если по какой-то причине отсутствует — возьмём performance.timeOrigin как минимальное приближение.
  let startMs = parseInt(sessionStorage.getItem('ac_session_start') || '0', 10);
  if (!startMs) {
    startMs = Math.floor(performance.timeOrigin || Date.now());
    sessionStorage.setItem('ac_session_start', String(startMs));
  }
  const session_ms = String(Date.now() - startMs);

  // Device detection: iPhone / iPad / Android / Desktop / Bot
  const ua = navigator.userAgent || '';
  const uaLow = ua.toLowerCase();
  let device = 'Desktop';
  if (/iphone/i.test(ua)) device = 'iPhone';
  else if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document)) device = 'iPad';
  else if (/android/i.test(ua)) {
    device = /mobile/i.test(ua) ? 'Android phone' : 'Android tablet';
  } else if (/macintosh|mac os x/i.test(uaLow)) device = 'Mac';
  else if (/windows/i.test(uaLow)) device = 'Windows';
  else if (/linux/i.test(uaLow)) device = 'Linux';

  // Browser
  let browser = '';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/yabrowser/i.test(ua)) browser = 'Yandex Browser';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/chrome/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua)) browser = 'Safari';

  return {
    ...attr,
    landing_url: window.location.href,
    page_title: document.title,
    referrer: document.referrer,
    ym_client_id,
    ubtcuid: getUbtcuid(),
    domain_userid: getDomainUserId(),
    device,
    browser,
    screen: `${screen.width}×${screen.height}`,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    language: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    session_ms,
  };
}

/** Submit a lead to /api/lead and fire tracking pixels */
export async function submitLead(data: {
  phone: string;
  age: string;
  shift?: string;
  source?: string;
  form?: string;
  call_time?: string;
}): Promise<boolean> {
  (window as any).trackGoal?.('form_submit', { form: data.form || 'booking', age: data.age });

  const ctx = collectContext();

  try {
    await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: data.phone,
        age: data.age,
        shift: data.shift || '',
        source: data.source || ctx.utm_source || '',
        call_time: data.call_time || '',
        ...ctx,
      }),
    });

    (window as any)._tmr = (window as any)._tmr || [];
    (window as any)._tmr.push({ type: 'reachGoal', id: MAILRU_PIXEL_ID, value: 6375, goal: 'lead' });

    return true;
  } catch {
    return false;
  }
}
