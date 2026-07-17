export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../lib/fetchWithTimeout';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const CONFIG_PATH = '/var/www/aidacamp-dev/gbp-config.json';
const CONFIG_PATH_LOCAL = join(process.cwd(), 'gbp-config.json');

// --- helpers ----------------------------------------------------------------

async function readConfig(): Promise<Record<string, string>> {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try {
      const raw = await readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch { /* skip */ }
  }
  return {};
}

async function getAccessToken(cfg: Record<string, string>): Promise<string> {
  const res = await fetchWithTimeout('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.clientId ?? import.meta.env.GBP_CLIENT_ID ?? '',
      client_secret: cfg.clientSecret ?? import.meta.env.GBP_CLIENT_SECRET ?? '',
      refresh_token: cfg.refreshToken ?? import.meta.env.GBP_REFRESH_TOKEN ?? '',
      grant_type: 'refresh_token',
    }),
  });
  const data: { access_token?: string; error?: string; error_description?: string } = await res.json();
  if (!data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Не удалось получить access_token');
  }
  return data.access_token;
}

// --- POST: создать пост -------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, ctaType, ctaUrl, imageUrl, topicType = 'STANDARD', eventTitle, eventStart, eventEnd } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ ok: false, error: 'Текст поста обязателен' }), { status: 400 });
    }
    if (text.length > 1500) {
      return new Response(JSON.stringify({ ok: false, error: 'Текст не должен превышать 1500 символов' }), { status: 400 });
    }

    const cfg = await readConfig();
    const locationId  = cfg.locationId  ?? import.meta.env.GBP_LOCATION_ID  ?? '';
    const accountId   = cfg.accountId   ?? import.meta.env.GBP_ACCOUNT_ID   ?? '';

    if (!locationId || !accountId) {
      return new Response(JSON.stringify({ ok: false, error: 'GBP не настроен. Сначала подключи аккаунт на /admin/gbp-setup' }), { status: 400 });
    }

    const accessToken = await getAccessToken(cfg);

    // Строим тело поста
    const post: Record<string, unknown> = {
      topicType,
      languageCode: 'ru',
      summary: text.trim(),
    };

    if (ctaType && ctaType !== 'NONE') {
      post.callToAction = { actionType: ctaType, url: ctaUrl ?? 'https://aidacamp.ru/#shifts' };
    }

    if (imageUrl) {
      post.media = [{ mediaFormat: 'PHOTO', sourceUrl: imageUrl }];
    }

    if (topicType === 'EVENT' && eventTitle) {
      post.event = {
        title: eventTitle,
        schedule: {
          startDate: parseDate(eventStart),
          endDate: parseDate(eventEnd ?? eventStart),
        },
      };
    }

    const parent = `${accountId}/locations/${locationId.replace('locations/', '')}`;
    const apiUrl = `https://mybusiness.googleapis.com/v4/${parent}/localPosts`;

    const apiRes = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
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

// --- GET: список последних постов -------------------------------------------

export const GET: APIRoute = async () => {
  try {
    const cfg = await readConfig();
    const locationId  = cfg.locationId  ?? import.meta.env.GBP_LOCATION_ID  ?? '';
    const accountId   = cfg.accountId   ?? import.meta.env.GBP_ACCOUNT_ID   ?? '';

    if (!locationId || !accountId) {
      return new Response(JSON.stringify({ ok: false, error: 'GBP не настроен' }), { status: 400 });
    }

    const accessToken = await getAccessToken(cfg);
    const parent = `${accountId}/locations/${locationId.replace('locations/', '')}`;
    const apiRes = await fetchWithTimeout(`https://mybusiness.googleapis.com/v4/${parent}/localPosts?pageSize=10`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const result = await apiRes.json();
    return new Response(JSON.stringify({ ok: true, posts: result.localPosts ?? [] }), { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};

// --- helpers ----------------------------------------------------------------

function parseDate(s: string | undefined): { year: number; month: number; day: number } | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}
