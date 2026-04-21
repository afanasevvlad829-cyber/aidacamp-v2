import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const prerender = false;
const CONFIG_PATH = "/var/www/aidacamp-dev/gbp-config.json";
const CONFIG_PATH_LOCAL = join(process.cwd(), "gbp-config.json");
async function readConfig() {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try {
      const raw = await readFile(p, "utf8");
      return JSON.parse(raw);
    } catch {
    }
  }
  return {};
}
async function getAccessToken(cfg) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId ?? undefined                              ?? "",
      client_secret: cfg.clientSecret ?? undefined                                  ?? "",
      refresh_token: cfg.refreshToken ?? undefined                                  ?? "",
      grant_type: "refresh_token"
    })
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "Не удалось получить access_token");
  }
  return data.access_token;
}
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, ctaType, ctaUrl, imageUrl, topicType = "STANDARD", eventTitle, eventStart, eventEnd } = body;
    if (!text?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: "Текст поста обязателен" }), { status: 400 });
    }
    if (text.length > 1500) {
      return new Response(JSON.stringify({ ok: false, error: "Текст не должен превышать 1500 символов" }), { status: 400 });
    }
    const cfg = await readConfig();
    const locationId = cfg.locationId ?? undefined                                ?? "";
    const accountId = cfg.accountId ?? undefined                               ?? "";
    if (!locationId || !accountId) {
      return new Response(JSON.stringify({ ok: false, error: "GBP не настроен. Сначала подключи аккаунт на /admin/gbp-setup" }), { status: 400 });
    }
    const accessToken = await getAccessToken(cfg);
    const post = {
      topicType,
      languageCode: "ru",
      summary: text.trim()
    };
    if (ctaType && ctaType !== "NONE") {
      post.callToAction = { actionType: ctaType, url: ctaUrl ?? "https://aidacamp.ru/#shifts" };
    }
    if (imageUrl) {
      post.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];
    }
    if (topicType === "EVENT" && eventTitle) {
      post.event = {
        title: eventTitle,
        schedule: {
          startDate: parseDate(eventStart),
          endDate: parseDate(eventEnd ?? eventStart)
        }
      };
    }
    const parent = `${accountId}/locations/${locationId.replace("locations/", "")}`;
    const apiUrl = `https://mybusiness.googleapis.com/v4/${parent}/localPosts`;
    const apiRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(post)
    });
    const result = await apiRes.json();
    if (!apiRes.ok) {
      const msg = result?.error?.message ?? `HTTP ${apiRes.status}`;
      return new Response(JSON.stringify({ ok: false, error: msg, detail: result }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, post: result }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};
const GET = async () => {
  try {
    const cfg = await readConfig();
    const locationId = cfg.locationId ?? undefined                                ?? "";
    const accountId = cfg.accountId ?? undefined                               ?? "";
    if (!locationId || !accountId) {
      return new Response(JSON.stringify({ ok: false, error: "GBP не настроен" }), { status: 400 });
    }
    const accessToken = await getAccessToken(cfg);
    const parent = `${accountId}/locations/${locationId.replace("locations/", "")}`;
    const apiRes = await fetch(`https://mybusiness.googleapis.com/v4/${parent}/localPosts?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const result = await apiRes.json();
    return new Response(JSON.stringify({ ok: true, posts: result.localPosts ?? [] }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};
function parseDate(s) {
  if (!s) return void 0;
  const [y, m, d] = s.split("-").map(Number);
  return { year: y, month: m, day: d };
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
