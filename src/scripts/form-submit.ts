import { MAILRU_PIXEL_ID } from '../data/tracking';
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
      ym(96499295, 'getClientID', (id: string) => {
        ym_client_id = id || '';
      });
    }
  } catch {
    /* ignore */
  }
  if (!ym_client_id) ym_client_id = getYmUidCookie();

  // session_ms — время с первого открытия страницы
  if (!sessionStorage.getItem('ac_session_start')) {
    sessionStorage.setItem('ac_session_start', String(Date.now()));
  }
  const session_ms = String(
    Date.now() - parseInt(sessionStorage.getItem('ac_session_start')!, 10)
  );

  return {
    ...attr,
    landing_url: window.location.href,
    page_title: document.title,
    referrer: document.referrer,
    ym_client_id,
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
