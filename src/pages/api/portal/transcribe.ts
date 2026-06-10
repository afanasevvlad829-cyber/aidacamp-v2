export const prerender = false;
import type { APIRoute } from 'astro';
import { requireStaff } from '../../../lib/portalPerms';

const ALLOWED = new Set(['admin', 'rukovoditel', 'teacher', 'vozhaty', 'student']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 МБ — ~ минута wav/opus

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}

type Provider = { name: string; url: string; key: string; model: string };

function providers(): Provider[] {
  const list: Provider[] = [];
  const groq = process.env.GROQ_API_KEY?.trim();
  if (groq) {
    list.push({
      name: 'groq',
      url: 'https://api.groq.com/openai/v1/audio/transcriptions',
      key: groq,
      // whisper-large-v3-turbo — самый быстрый и бесплатный на Groq
      model: 'whisper-large-v3-turbo',
    });
  }
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    list.push({
      name: 'openai',
      url: 'https://api.openai.com/v1/audio/transcriptions',
      key: openai,
      model: 'whisper-1',
    });
  }
  return list;
}

async function callProvider(p: Provider, blob: File): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  const upstream = new FormData();
  upstream.append('file', blob, blob.name || 'voice.webm');
  upstream.append('model', p.model);
  upstream.append('language', 'ru');
  upstream.append('response_format', 'json');
  try {
    const r = await fetch(p.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${p.key}` },
      body: upstream,
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return { ok: false, status: r.status, detail: detail.slice(0, 300) };
    }
    const data = await r.json().catch(() => ({}));
    const text = String((data as any)?.text ?? '').trim();
    return { ok: true, text };
  } catch (e: any) {
    return { ok: false, status: 0, detail: e?.message ?? 'fetch failed' };
  }
}

/**
 * POST /api/portal/transcribe
 *   multipart/form-data: file=<audio blob>
 *   → { ok, text, provider }
 *
 * Чейн: GROQ (whisper-large-v3-turbo, бесплатно) → OpenAI (whisper-1, $0.006/мин) fallback.
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const _a = requireStaff(locals);
  if (_a instanceof Response) return _a;
  const { role, sub } = _a;
  if (!ALLOWED.has(role)) return err('forbidden', 403);

  const chain = providers();
  if (chain.length === 0) return err('no transcribe provider configured (GROQ_API_KEY/OPENAI_API_KEY)', 500);

  let form: FormData;
  try { form = await request.formData(); } catch { return err('invalid form'); }

  const file = form.get('file');
  if (!file || typeof file === 'string') return err('file required');
  const blob = file as File;
  if (blob.size > MAX_BYTES) return err(`audio too large (>${Math.round(MAX_BYTES / 1024 / 1024)} MB)`, 413);

  const errors: string[] = [];
  for (const p of chain) {
    const res = await callProvider(p, blob);
    if (res.ok) {
      return new Response(JSON.stringify({ ok: true, text: res.text, provider: p.name }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    errors.push(`${p.name} ${res.status}: ${res.detail}`);
    // Если 401/403/429 — переходим к следующему провайдеру, иначе тоже идём дальше
  }
  return err('all providers failed: ' + errors.join(' | '), 502);
};
