export interface ApiResult<T = any> { ok: boolean; error?: string; [k: string]: any }

async function parse<T>(r: Response): Promise<ApiResult<T>> {
  const body = await r.json().catch(() => ({} as any));
  if (!r.ok && body.ok == null) return { ...body, ok: false, error: body.error ?? `HTTP ${r.status}` };
  return body.ok != null ? body : { ...body, ok: r.ok };
}

export async function postJson<T = any>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    return parse<T>(r);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network' };
  }
}

export async function postForm<T = any>(url: string, fd: FormData): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, { method: 'POST', body: fd, credentials: 'include' });
    return parse<T>(r);
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'network' };
  }
}
