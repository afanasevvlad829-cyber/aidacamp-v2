import { c as createComponent } from './astro-component_BmS5qpDl.mjs';
import 'piccolore';
import { h as renderHead, i as renderComponent, j as Fragment, r as renderTemplate } from './server_QJKZbavQ.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const prerender = false;
const $$GbpCallback = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$GbpCallback;
  const CONFIG_PATH = "/var/www/aidacamp-dev/gbp-config.json";
  const CONFIG_PATH_LOCAL = join(process.cwd(), "gbp-config.json");
  async function readConfig() {
    for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
      try {
        return JSON.parse(await readFile(p, "utf8"));
      } catch {
      }
    }
    return {};
  }
  async function saveConfig(data) {
    const path = process.env.NODE_ENV === "production" ? CONFIG_PATH : CONFIG_PATH_LOCAL;
    try {
      await mkdir(dirname(path), { recursive: true });
    } catch {
    }
    await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  }
  const code = Astro2.url.searchParams.get("code");
  const error = Astro2.url.searchParams.get("error");
  let result = { ok: false };
  if (code && !error) {
    try {
      const cfg = await readConfig();
      const clientId = cfg.clientId ?? undefined                              ?? "";
      const clientSecret = cfg.clientSecret ?? undefined                                  ?? "";
      const redirectUri = cfg.redirectUri ?? `${Astro2.url.origin}/admin/gbp-callback`;
      if (!clientId || !clientSecret) {
        result = { ok: false, error: "Client ID / Secret не настроены — вернись к шагу 1" };
      } else {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code"
          })
        });
        const text = await res.text();
        let tokens;
        try {
          tokens = JSON.parse(text);
        } catch {
          tokens = { error: text };
        }
        if (!tokens.refresh_token) {
          result = { ok: false, error: tokens.error_description ?? tokens.error ?? "Нет refresh_token" };
        } else {
          await saveConfig({ ...cfg, refreshToken: tokens.refresh_token });
          result = { ok: true };
        }
      }
    } catch (e) {
      result = { ok: false, error: String(e) };
    }
  }
  return renderTemplate`<html lang="ru" data-astro-cid-y7q6xun7> <head><meta charset="UTF-8"><title>GBP Auth — АйДаКемп</title>${renderHead()}</head> <body data-astro-cid-y7q6xun7> <div class="box" data-astro-cid-y7q6xun7> ${error ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-y7q6xun7": true }, { "default": async ($$result2) => renderTemplate` <h1 class="err" data-astro-cid-y7q6xun7>Ошибка авторизации</h1> <p data-astro-cid-y7q6xun7>${error}</p> <a href="/admin/gbp-setup" data-astro-cid-y7q6xun7>← Назад к настройкам</a> ` })}` : result.ok ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-y7q6xun7": true }, { "default": async ($$result2) => renderTemplate` <h1 class="ok" data-astro-cid-y7q6xun7>✓ Авторизация успешна!</h1> <p data-astro-cid-y7q6xun7>Refresh token сохранён. Теперь выбери локацию бизнеса.</p> <a href="/admin/gbp-setup?done=1" data-astro-cid-y7q6xun7>Продолжить настройку →</a> ` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, { "data-astro-cid-y7q6xun7": true }, { "default": async ($$result2) => renderTemplate` <h1 class="err" data-astro-cid-y7q6xun7>Не удалось получить токен</h1> <p data-astro-cid-y7q6xun7>${result.error ?? "Неизвестная ошибка"}</p> <a href="/admin/gbp-setup" data-astro-cid-y7q6xun7>← Назад к настройкам</a> ` })}`} </div> </body></html>`;
}, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-callback.astro", void 0);
const $$file = "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gbp-callback.astro";
const $$url = "/admin/gbp-callback";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$GbpCallback,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
