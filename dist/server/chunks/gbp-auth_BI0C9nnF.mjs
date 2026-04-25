import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const prerender = false;
const CONFIG_PATH = "/var/www/aidacamp-dev/gbp-config.json";
const CONFIG_PATH_LOCAL = join(process.cwd(), "gbp-config.json");
const SCOPES = [
  "https://www.googleapis.com/auth/business.manage"
].join(" ");
async function saveConfig(data) {
  const path = process.env.NODE_ENV === "production" ? CONFIG_PATH : CONFIG_PATH_LOCAL;
  try {
    await mkdir(dirname(path), { recursive: true });
  } catch {
  }
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}
async function readConfig() {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
    }
  }
  return {};
}
const GET = async ({ request, url }) => {
  const action = url.searchParams.get("action");
  const code = url.searchParams.get("code");
  if (action === "url") {
    const cfg2 = await readConfig();
    const clientId = cfg2.clientId ?? undefined                              ?? "";
    const redirectUri = cfg2.redirectUri ?? undefined                                 ?? `${url.origin}/admin/gbp-callback`;
    if (!clientId) {
      return new Response(JSON.stringify({ ok: false, error: "GBP_CLIENT_ID не задан" }), { status: 400 });
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent"
    });
    return new Response(JSON.stringify({ ok: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` }), { status: 200 });
  }
  if (code) {
    const cfg2 = await readConfig();
    const clientId = cfg2.clientId ?? undefined                              ?? "";
    const clientSecret = cfg2.clientSecret ?? undefined                                  ?? "";
    const redirectUri = cfg2.redirectUri ?? undefined                                 ?? `${url.origin}/admin/gbp-callback`;
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await res.json();
    if (!tokens.refresh_token) {
      return new Response(JSON.stringify({ ok: false, error: tokens.error ?? "Нет refresh_token — убедись что prompt=consent" }), { status: 400 });
    }
    await saveConfig({ ...cfg2, refreshToken: tokens.refresh_token });
    const accsRes = await fetch("https://mybusiness.googleapis.com/v4/accounts", {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const accs = await accsRes.json();
    return new Response(JSON.stringify({ ok: true, refreshToken: "✓ сохранён", accounts: accs.accounts ?? [] }), { status: 200 });
  }
  const cfg = await readConfig();
  const hasToken = !!(cfg.refreshToken ?? undefined                                 );
  return new Response(JSON.stringify({
    ok: true,
    configured: hasToken && !!cfg.locationId,
    hasRefreshToken: hasToken,
    hasLocation: !!cfg.locationId,
    accountId: cfg.accountId ?? null,
    locationId: cfg.locationId ?? null
  }), { status: 200 });
};
const POST = async ({ request }) => {
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

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
