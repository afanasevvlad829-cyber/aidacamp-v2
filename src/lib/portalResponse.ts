/**
 * Общие JSON-хелперы для portal API.
 * Использовать вместо локальных ok/bad/unauthorized/forbidden в каждом эндпоинте.
 */

export function apiOk(payload: unknown = {}, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...(payload as object) }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function apiBad(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function apiUnauthorized(msg = 'unauthorized'): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function apiForbidden(msg = 'forbidden'): Response {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  });
}
