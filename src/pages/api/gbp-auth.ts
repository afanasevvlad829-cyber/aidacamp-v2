export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../lib/fetchWithTimeout';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const CONFIG_PATH = '/var/www/aidacamp-dev/gbp-config.json';
const CONFIG_PATH_LOCAL = join(process.cwd(), 'gbp-config.json');

const SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
].join(' ');

async function saveConfig(data: Record<string, string>) {
  const path = process.env.NODE_ENV === 'production' ? CONFIG_PATH : CONFIG_PATH_LOCAL;
  try { await mkdir(dirname(path), { recursive: true }); } catch { /* ok */ }
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

async function readConfig(): Promise<Record<string, string>> {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try { return JSON.parse(await readFile(p, 'utf8')); } catch { /* skip */ }
  }
  return {};
}

// GET /api/gbp-auth?action=url  → возвращает URL для OAuth авторизации
// GET /api/gbp-auth?code=...    → callback от Google, обменивает code на tokens
// POST /api/gbp-auth             → сохраняет accountId + locationId вручную

export const GET: APIRoute = async ({ request, url }) => {
  const action = url.searchParams.get('action');
  const code   = url.searchParams.get('code');

  // 1. Сгенерировать URL для OAuth
  if (action === 'url') {
    const cfg = await readConfig();
    const clientId    = cfg.clientId    ?? import.meta.env.GBP_CLIENT_ID    ?? '';
    const redirectUri = cfg.redirectUri ?? import.meta.env.GBP_REDIRECT_URI ?? `${url.origin}/admin/gbp-callback`;

    if (!clientId) {
      return new Response(JSON.stringify({ ok: false, error: 'GBP_CLIENT_ID не задан' }), { status: 400 });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
    });

    return new Response(JSON.stringify({ ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }), { status: 200 });
  }

  // 2. OAuth callback — обменять code на tokens
  if (code) {
    const cfg = await readConfig();
    const clientId     = cfg.clientId     ?? import.meta.env.GBP_CLIENT_ID     ?? '';
    const clientSecret = cfg.clientSecret ?? import.meta.env.GBP_CLIENT_SECRET ?? '';
    const redirectUri  = cfg.redirectUri  ?? import.meta.env.GBP_REDIRECT_URI  ?? `${url.origin}/admin/gbp-callback`;

    const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
    });

    const tokens: { access_token?: string; refresh_token?: string; error?: string } = await res.json();
    if (!tokens.refresh_token) {
      return new Response(JSON.stringify({ ok: false, error: tokens.error ?? 'Нет refresh_token — убедись что prompt=consent' }), { status: 400 });
    }

    await saveConfig({ ...cfg, refreshToken: tokens.refresh_token });

    // Получаем список аккаунтов
    const accsRes = await fetchWithTimeout('https://mybusiness.googleapis.com/v4/accounts', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const accs: { accounts?: Array<{ name: string; accountName: string }> } = await accsRes.json();

    return new Response(JSON.stringify({ ok: true, refreshToken: '✓ сохранён', accounts: accs.accounts ?? [] }), { status: 200 });
  }

  // 3. Проверить текущее состояние конфига
  const cfg = await readConfig();
  const hasToken = !!(cfg.refreshToken ?? import.meta.env.GBP_REFRESH_TOKEN);
  return new Response(JSON.stringify({
    ok: true,
    configured: hasToken && !!cfg.locationId,
    hasRefreshToken: hasToken,
    hasLocation: !!cfg.locationId,
    accountId: cfg.accountId ?? null,
    locationId: cfg.locationId ?? null,
  }), { status: 200 });
};

// POST /api/gbp-auth — сохранить clientId, clientSecret, accountId, locationId
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const cfg = await readConfig();
    const merged = { ...cfg, ...body };
    await saveConfig(merged);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
};
