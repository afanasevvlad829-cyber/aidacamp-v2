import { c as createComponent } from './astro-component_D56H0FPW.mjs';
import 'piccolore';
import { L as renderTemplate, a1 as addAttribute, aY as renderHead } from './sequence_C7YAHkIp.mjs';
import 'clsx';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));
var _a;
const prerender = false;
const $$GbpSetup = createComponent(async ($$result, $$props, $$slots) => {
  async function readConfig() {
    for (const p of ["/var/www/aidacamp-dev/gbp-config.json", join(process.cwd(), "gbp-config.json")]) {
      try {
        return JSON.parse(await readFile(p, "utf8"));
      } catch {
      }
    }
    return {};
  }
  const cfg = await readConfig();
  return renderTemplate(_a || (_a = __template(['<html lang="ru" data-astro-cid-fa3evz7p> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GBP Setup — АйДаКемп</title>', '</head> <body data-astro-cid-fa3evz7p> <div class="wrap" data-astro-cid-fa3evz7p> <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px" data-astro-cid-fa3evz7p> <a href="/admin/gbp-posts" style="color:#64748b;font-size:13px" data-astro-cid-fa3evz7p>← к постам</a> </div> <h1 data-astro-cid-fa3evz7p>Подключение Google Business Profile</h1> <p class="sub" data-astro-cid-fa3evz7p>Настройте один раз — потом публикуйте посты прямо с сайта.</p> <!-- Статус конфигурации --> <div class="card" id="statusCard" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p>Текущий статус</h2> <div id="statusContent" style="color:#64748b;font-size:14px" data-astro-cid-fa3evz7p>Проверяю...</div> </div> <!-- Шаг 1: Создать OAuth приложение --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>1</span> Создать OAuth-приложение в Google Cloud</h2> <ol style="font-size:13px;color:#94a3b8;line-height:1.8;padding-left:18px;margin-bottom:14px" data-astro-cid-fa3evz7p> <li data-astro-cid-fa3evz7p>Открой <a href="https://console.cloud.google.com/apis/credentials" target="_blank" data-astro-cid-fa3evz7p>console.cloud.google.com → APIs & Credentials</a></li> <li data-astro-cid-fa3evz7p>Создай проект (или выбери существующий)</li> <li data-astro-cid-fa3evz7p>Включи API: <strong data-astro-cid-fa3evz7p>My Business API</strong> + <strong data-astro-cid-fa3evz7p>Business Profile Performance API</strong></li> <li data-astro-cid-fa3evz7p>Создай <strong data-astro-cid-fa3evz7p>OAuth 2.0 Client ID</strong> (тип: Web application)</li> <li data-astro-cid-fa3evz7p>В Authorized redirect URIs добавь:<br data-astro-cid-fa3evz7p> <span class="code" id="callbackUri" data-astro-cid-fa3evz7p></span> </li> <li data-astro-cid-fa3evz7p>Скопируй Client ID и Client Secret ниже</li> </ol> <div class="row" data-astro-cid-fa3evz7p> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Client ID</label> <input id="clientId" type="text" placeholder="xxx.apps.googleusercontent.com"', ' data-astro-cid-fa3evz7p> </div> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Client Secret</label> <input id="clientSecret" type="password" placeholder="GOCSPX-..."', ` data-astro-cid-fa3evz7p> </div> </div> <button class="btn btn-sec" onclick="saveCreds()" data-astro-cid-fa3evz7p>Сохранить credentials</button> <div id="credsStatus" class="status" data-astro-cid-fa3evz7p></div> </div> <!-- Шаг 2: Авторизация --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>2</span> Авторизовать Google аккаунт</h2> <p style="font-size:13px;color:#94a3b8;margin-bottom:14px" data-astro-cid-fa3evz7p>
Нажми кнопку — откроется Google. Войди в аккаунт, у которого есть доступ к Business Profile. Страница автоматически вернётся сюда.
</p> <button class="btn" onclick="startOAuth()" data-astro-cid-fa3evz7p> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0" data-astro-cid-fa3evz7p><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" data-astro-cid-fa3evz7p></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" data-astro-cid-fa3evz7p></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" data-astro-cid-fa3evz7p></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" data-astro-cid-fa3evz7p></path></svg>
Войти через Google
</button> <div id="oauthStatus" class="status" data-astro-cid-fa3evz7p></div> </div> <!-- Шаг 3: Выбрать локацию --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>3</span> Выбрать локацию бизнеса</h2> <p style="font-size:13px;color:#94a3b8;margin-bottom:14px" data-astro-cid-fa3evz7p>
После авторизации выбери аккаунт и локацию АйДаКемп из списка, либо введи вручную.
</p> <div id="accountsList" style="display:none" data-astro-cid-fa3evz7p></div> <div class="row" data-astro-cid-fa3evz7p> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Account ID</label> <input id="accountId" type="text" placeholder="accounts/123456789" data-astro-cid-fa3evz7p> <p class="hint" data-astro-cid-fa3evz7p>Формат: accounts/ЧИСЛО</p> </div> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Location ID</label> <input id="locationId" type="text" placeholder="locations/987654321" data-astro-cid-fa3evz7p> <p class="hint" data-astro-cid-fa3evz7p>Из GBP → Бизнес-профиль → Настройки → ID</p> </div> </div> <button class="btn" onclick="saveLocation()" data-astro-cid-fa3evz7p>Сохранить локацию</button> <button class="btn btn-sec" style="margin-left:10px" onclick="loadAccounts()" data-astro-cid-fa3evz7p>Загрузить аккаунты</button> <div id="locationStatus" class="status" data-astro-cid-fa3evz7p></div> </div> </div> <script>
  const callbackUri = window.location.origin + '/admin/gbp-callback';
  document.getElementById('callbackUri').textContent = callbackUri;

  // Проверить статус
  async function checkStatus() {
    const r = await fetch('/api/gbp-auth');
    const d = await r.json();
    const el = document.getElementById('statusContent');
    const rows = [
      { label: 'OAuth credentials', ok: !!d.hasRefreshToken },
      { label: 'Refresh token', ok: !!d.hasRefreshToken },
      { label: 'Location настроен', ok: !!d.hasLocation },
      { label: 'Полностью готов', ok: !!d.configured },
    ];
    el.innerHTML = rows.map(r => \`
      <div class="check-row">
        <span>\${r.label}</span>
        <span class="badge \${r.ok ? 'ok' : 'err'}">\${r.ok ? '✓' : '✗'}</span>
      </div>
    \`).join('');
    if (d.configured) {
      document.getElementById('statusCard').style.border = '1px solid #15803d';
    }
    if (d.accountId) document.getElementById('accountId').value = d.accountId;
    if (d.locationId) document.getElementById('locationId').value = d.locationId;
  }
  checkStatus();

  // Проверить OAuth callback
  const params = new URLSearchParams(window.location.search);
  if (params.get('done') === '1') {
    const s = document.getElementById('oauthStatus');
    s.textContent = '✓ Авторизация успешна! Refresh token сохранён.';
    s.className = 'status ok';
    checkStatus();
  }

  async function saveCreds() {
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const el = document.getElementById('credsStatus');
    if (!clientId || !clientSecret) { el.textContent = 'Заполни оба поля'; el.className = 'status err'; return; }
    const r = await fetch('/api/gbp-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret, redirectUri: callbackUri }) });
    const d = await r.json();
    if (d.ok) { el.textContent = '✓ Сохранено'; el.className = 'status ok'; }
    else { el.textContent = d.error; el.className = 'status err'; }
  }

  async function startOAuth() {
    const r = await fetch('/api/gbp-auth?action=url');
    const d = await r.json();
    const el = document.getElementById('oauthStatus');
    if (!d.ok) { el.textContent = d.error; el.className = 'status err'; return; }
    window.location.href = d.url;
  }

  async function loadAccounts() {
    const r = await fetch('/api/gbp-auth?action=accounts');
    const d = await r.json();
    const el = document.getElementById('accountsList');
    if (!d.ok || !d.accounts?.length) { el.style.display = 'block'; el.innerHTML = '<p style="font-size:13px;color:#64748b">Нет аккаунтов или не авторизован</p>'; return; }
    el.style.display = 'block';
    el.innerHTML = '<p style="font-size:12px;color:#64748b;margin-bottom:8px">Кликни на аккаунт чтобы выбрать:</p>' + d.accounts.map(a => \`
      <div class="acc-item" onclick="selectAccount('\${a.name}')">
        <div class="name">\${a.accountName}</div>
        <div class="id">\${a.name}</div>
      </div>\`).join('');
  }

  function selectAccount(name) {
    document.getElementById('accountId').value = name;
  }

  async function saveLocation() {
    const accountId = document.getElementById('accountId').value.trim();
    const locationId = document.getElementById('locationId').value.trim();
    const el = document.getElementById('locationStatus');
    if (!accountId || !locationId) { el.textContent = 'Заполни оба поля'; el.className = 'status err'; return; }
    const r = await fetch('/api/gbp-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, locationId }) });
    const d = await r.json();
    if (d.ok) { el.textContent = '✓ Сохранено! Можно публиковать посты.'; el.className = 'status ok'; checkStatus(); }
    else { el.textContent = d.error; el.className = 'status err'; }
  }
<\/script> </body> </html>`], ['<html lang="ru" data-astro-cid-fa3evz7p> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>GBP Setup — АйДаКемп</title>', '</head> <body data-astro-cid-fa3evz7p> <div class="wrap" data-astro-cid-fa3evz7p> <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px" data-astro-cid-fa3evz7p> <a href="/admin/gbp-posts" style="color:#64748b;font-size:13px" data-astro-cid-fa3evz7p>← к постам</a> </div> <h1 data-astro-cid-fa3evz7p>Подключение Google Business Profile</h1> <p class="sub" data-astro-cid-fa3evz7p>Настройте один раз — потом публикуйте посты прямо с сайта.</p> <!-- Статус конфигурации --> <div class="card" id="statusCard" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p>Текущий статус</h2> <div id="statusContent" style="color:#64748b;font-size:14px" data-astro-cid-fa3evz7p>Проверяю...</div> </div> <!-- Шаг 1: Создать OAuth приложение --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>1</span> Создать OAuth-приложение в Google Cloud</h2> <ol style="font-size:13px;color:#94a3b8;line-height:1.8;padding-left:18px;margin-bottom:14px" data-astro-cid-fa3evz7p> <li data-astro-cid-fa3evz7p>Открой <a href="https://console.cloud.google.com/apis/credentials" target="_blank" data-astro-cid-fa3evz7p>console.cloud.google.com → APIs & Credentials</a></li> <li data-astro-cid-fa3evz7p>Создай проект (или выбери существующий)</li> <li data-astro-cid-fa3evz7p>Включи API: <strong data-astro-cid-fa3evz7p>My Business API</strong> + <strong data-astro-cid-fa3evz7p>Business Profile Performance API</strong></li> <li data-astro-cid-fa3evz7p>Создай <strong data-astro-cid-fa3evz7p>OAuth 2.0 Client ID</strong> (тип: Web application)</li> <li data-astro-cid-fa3evz7p>В Authorized redirect URIs добавь:<br data-astro-cid-fa3evz7p> <span class="code" id="callbackUri" data-astro-cid-fa3evz7p></span> </li> <li data-astro-cid-fa3evz7p>Скопируй Client ID и Client Secret ниже</li> </ol> <div class="row" data-astro-cid-fa3evz7p> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Client ID</label> <input id="clientId" type="text" placeholder="xxx.apps.googleusercontent.com"', ' data-astro-cid-fa3evz7p> </div> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Client Secret</label> <input id="clientSecret" type="password" placeholder="GOCSPX-..."', ` data-astro-cid-fa3evz7p> </div> </div> <button class="btn btn-sec" onclick="saveCreds()" data-astro-cid-fa3evz7p>Сохранить credentials</button> <div id="credsStatus" class="status" data-astro-cid-fa3evz7p></div> </div> <!-- Шаг 2: Авторизация --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>2</span> Авторизовать Google аккаунт</h2> <p style="font-size:13px;color:#94a3b8;margin-bottom:14px" data-astro-cid-fa3evz7p>
Нажми кнопку — откроется Google. Войди в аккаунт, у которого есть доступ к Business Profile. Страница автоматически вернётся сюда.
</p> <button class="btn" onclick="startOAuth()" data-astro-cid-fa3evz7p> <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0" data-astro-cid-fa3evz7p><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" data-astro-cid-fa3evz7p></path><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" data-astro-cid-fa3evz7p></path><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" data-astro-cid-fa3evz7p></path><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" data-astro-cid-fa3evz7p></path></svg>
Войти через Google
</button> <div id="oauthStatus" class="status" data-astro-cid-fa3evz7p></div> </div> <!-- Шаг 3: Выбрать локацию --> <div class="card" data-astro-cid-fa3evz7p> <h2 data-astro-cid-fa3evz7p><span class="step-num" data-astro-cid-fa3evz7p>3</span> Выбрать локацию бизнеса</h2> <p style="font-size:13px;color:#94a3b8;margin-bottom:14px" data-astro-cid-fa3evz7p>
После авторизации выбери аккаунт и локацию АйДаКемп из списка, либо введи вручную.
</p> <div id="accountsList" style="display:none" data-astro-cid-fa3evz7p></div> <div class="row" data-astro-cid-fa3evz7p> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Account ID</label> <input id="accountId" type="text" placeholder="accounts/123456789" data-astro-cid-fa3evz7p> <p class="hint" data-astro-cid-fa3evz7p>Формат: accounts/ЧИСЛО</p> </div> <div class="field" data-astro-cid-fa3evz7p> <label data-astro-cid-fa3evz7p>Location ID</label> <input id="locationId" type="text" placeholder="locations/987654321" data-astro-cid-fa3evz7p> <p class="hint" data-astro-cid-fa3evz7p>Из GBP → Бизнес-профиль → Настройки → ID</p> </div> </div> <button class="btn" onclick="saveLocation()" data-astro-cid-fa3evz7p>Сохранить локацию</button> <button class="btn btn-sec" style="margin-left:10px" onclick="loadAccounts()" data-astro-cid-fa3evz7p>Загрузить аккаунты</button> <div id="locationStatus" class="status" data-astro-cid-fa3evz7p></div> </div> </div> <script>
  const callbackUri = window.location.origin + '/admin/gbp-callback';
  document.getElementById('callbackUri').textContent = callbackUri;

  // Проверить статус
  async function checkStatus() {
    const r = await fetch('/api/gbp-auth');
    const d = await r.json();
    const el = document.getElementById('statusContent');
    const rows = [
      { label: 'OAuth credentials', ok: !!d.hasRefreshToken },
      { label: 'Refresh token', ok: !!d.hasRefreshToken },
      { label: 'Location настроен', ok: !!d.hasLocation },
      { label: 'Полностью готов', ok: !!d.configured },
    ];
    el.innerHTML = rows.map(r => \\\`
      <div class="check-row">
        <span>\\\${r.label}</span>
        <span class="badge \\\${r.ok ? 'ok' : 'err'}">\\\${r.ok ? '✓' : '✗'}</span>
      </div>
    \\\`).join('');
    if (d.configured) {
      document.getElementById('statusCard').style.border = '1px solid #15803d';
    }
    if (d.accountId) document.getElementById('accountId').value = d.accountId;
    if (d.locationId) document.getElementById('locationId').value = d.locationId;
  }
  checkStatus();

  // Проверить OAuth callback
  const params = new URLSearchParams(window.location.search);
  if (params.get('done') === '1') {
    const s = document.getElementById('oauthStatus');
    s.textContent = '✓ Авторизация успешна! Refresh token сохранён.';
    s.className = 'status ok';
    checkStatus();
  }

  async function saveCreds() {
    const clientId = document.getElementById('clientId').value.trim();
    const clientSecret = document.getElementById('clientSecret').value.trim();
    const el = document.getElementById('credsStatus');
    if (!clientId || !clientSecret) { el.textContent = 'Заполни оба поля'; el.className = 'status err'; return; }
    const r = await fetch('/api/gbp-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret, redirectUri: callbackUri }) });
    const d = await r.json();
    if (d.ok) { el.textContent = '✓ Сохранено'; el.className = 'status ok'; }
    else { el.textContent = d.error; el.className = 'status err'; }
  }

  async function startOAuth() {
    const r = await fetch('/api/gbp-auth?action=url');
    const d = await r.json();
    const el = document.getElementById('oauthStatus');
    if (!d.ok) { el.textContent = d.error; el.className = 'status err'; return; }
    window.location.href = d.url;
  }

  async function loadAccounts() {
    const r = await fetch('/api/gbp-auth?action=accounts');
    const d = await r.json();
    const el = document.getElementById('accountsList');
    if (!d.ok || !d.accounts?.length) { el.style.display = 'block'; el.innerHTML = '<p style="font-size:13px;color:#64748b">Нет аккаунтов или не авторизован</p>'; return; }
    el.style.display = 'block';
    el.innerHTML = '<p style="font-size:12px;color:#64748b;margin-bottom:8px">Кликни на аккаунт чтобы выбрать:</p>' + d.accounts.map(a => \\\`
      <div class="acc-item" onclick="selectAccount('\\\${a.name}')">
        <div class="name">\\\${a.accountName}</div>
        <div class="id">\\\${a.name}</div>
      </div>\\\`).join('');
  }

  function selectAccount(name) {
    document.getElementById('accountId').value = name;
  }

  async function saveLocation() {
    const accountId = document.getElementById('accountId').value.trim();
    const locationId = document.getElementById('locationId').value.trim();
    const el = document.getElementById('locationStatus');
    if (!accountId || !locationId) { el.textContent = 'Заполни оба поля'; el.className = 'status err'; return; }
    const r = await fetch('/api/gbp-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accountId, locationId }) });
    const d = await r.json();
    if (d.ok) { el.textContent = '✓ Сохранено! Можно публиковать посты.'; el.className = 'status ok'; checkStatus(); }
    else { el.textContent = d.error; el.className = 'status err'; }
  }
<\/script> </body> </html>`])), renderHead(), addAttribute(cfg.clientId ?? "", "value"), addAttribute(cfg.clientSecret ?? "", "value"));
}, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-setup.astro", void 0);

const $$file = "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-setup.astro";
const $$url = "/admin/gbp-setup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$GbpSetup,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
