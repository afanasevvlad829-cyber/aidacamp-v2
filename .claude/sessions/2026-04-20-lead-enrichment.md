# Handoff — 2026-04-20 — Lead enrichment + CRM fix

## Контекст за 30 секунд

CRM-ошибка в TG-нотификациях исправлена (перезапустили node с env). Ветка для обогащения лидов создана, но PR так и не открыт — сессия упёрлась в лимит контекста.

---

## Что сделано

- **CRM-ошибка устранена на сервере**: старый процесс node (порт 4181) убит, перезапущен через `source /var/www/aidacamp-dev/.env` — ALFACRM_HOSTNAME/EMAIL/API_KEY попали в env. Смок-тест: `{"ok":true,"crm_id":5020}` ✅
- **Ветка создана**: `agent/lead-attribution-enrichment` от `origin/dev` — существует локально и на remote
- **Код обогащения спроектирован** (в контексте сессии, в файлы не записан):
  - `src/scripts/form-submit.ts`: добавить `collectContext()` — UTM из URL + sessionStorage (`ac_attribution`), ym_client_id (Metrika getClientID + `_ym_uid` cookie), landing_url, referrer, screen/viewport/language/tz/session_ms
  - `src/pages/api/lead.ts`: принимать весь контекст, собирать richTG с секциями контакт/источник/поведение/устройство/IDs, интеграция AlfaCRM (уже работает)

---

## Что НЕ сделано

- **PR для обогащения НЕ создан** — ветка `agent/lead-attribution-enrichment` пустая (нет commits)
- **Следующий шаг**: записать enriched `form-submit.ts` + `lead.ts` → commit → push → `gh pr create`

---

## Код для form-submit.ts — collectContext()

```typescript
function getYmClientId(): string {
  try {
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith('_ym_uid='));
    return cookie ? cookie.trim().split('=')[1] : '';
  } catch { return ''; }
}

function collectContext() {
  const qs = new URLSearchParams(window.location.search);
  const pick = (k: string) => qs.get(k) || '';
  const stored = JSON.parse(sessionStorage.getItem('ac_attribution') || '{}');
  const currentUtm = {
    utm_source: pick('utm_source'), utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'), utm_content: pick('utm_content'),
    utm_term: pick('utm_term'), yclid: pick('yclid'), gclid: pick('gclid'),
  };
  if (Object.values(currentUtm).some(Boolean)) {
    sessionStorage.setItem('ac_attribution', JSON.stringify(currentUtm));
  }
  const attr = Object.values(currentUtm).some(Boolean) ? currentUtm : stored;

  let ym_client_id = '';
  try {
    if (typeof (window as any).ym !== 'undefined') {
      (window as any).ym(96499295, 'getClientID', (id: string) => { ym_client_id = id; });
    }
  } catch {}
  if (!ym_client_id) ym_client_id = getYmClientId();

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
    session_ms: Date.now() - (parseInt(sessionStorage.getItem('ac_session_start') || String(Date.now()), 10)),
  };
}
```

## Код для lead.ts — rich TG message

```typescript
// Принимает: phone, age, shift, source + весь контекст из collectContext()
function esc(s: string) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const lines: string[] = [];
lines.push('🎯 <b>Новая заявка АйДаКемп</b>');
lines.push(`📞 <b>${esc(phone)}</b>  |  👶 ${esc(age)}  |  🏕 ${esc(shift)}`);
lines.push('');
lines.push('<b>📍 Источник:</b>');
if (utm_source)   lines.push(`  utm_source: <code>${esc(utm_source)}</code>`);
if (utm_medium)   lines.push(`  utm_medium: <code>${esc(utm_medium)}</code>`);
if (utm_campaign) lines.push(`  Кампания: <code>${esc(utm_campaign)}</code>`);
if (utm_term)     lines.push(`  🔑 Ключ: <code>${esc(utm_term)}</code>`);
if (yclid)        lines.push(`  yclid: <code>${esc(yclid)}</code>`);
if (gclid)        lines.push(`  gclid: <code>${esc(gclid)}</code>`);
if (referrer)     lines.push(`  Реферер: <code>${esc(referrer.slice(0,80))}</code>`);
lines.push('');
lines.push('<b>🌐 Поведение:</b>');
lines.push(`  URL: <code>${esc(landing_url.slice(0,100))}</code>`);
if (session_ms)   lines.push(`  Время на сайте: ${Math.round(Number(session_ms)/1000)} сек`);
lines.push('');
lines.push('<b>💻 Устройство:</b>');
if (screen)       lines.push(`  Экран: ${esc(screen)} | Viewport: ${esc(viewport)}`);
if (language)     lines.push(`  Язык: ${esc(language)} | TZ: ${esc(tz)}`);
lines.push('');
lines.push('<b>🆔 IDs:</b>');
if (ym_client_id) lines.push(`  Метрика: <code>${esc(ym_client_id)}</code>`);
if (crmId)        lines.push(`  CRM: <b>#${crmId}</b>`);
```

---

## Инфраструктура

- Node процесс (порт 4181): PID меняется, проверять через `pgrep -fa node | grep 4181`
- Если упал — перезапустить: `cd /var/www/aidacamp-dev/repo && set -a && source /var/www/aidacamp-dev/.env && set +a && nohup node ./dist/server/entry.mjs &`
- systemd `aidacamp-dev.service` сломан (ERR_MODULE_NOT_FOUND) — не чинить, работаем через nohup
