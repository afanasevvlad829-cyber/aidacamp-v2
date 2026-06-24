/** Достаёт значение first-party cookie aid_visitor из запроса (или null). */
export function readVisitorId(request: Request): string | null {
  const raw = request.headers.get('cookie') ?? '';
  const m = raw.match(/(?:^|;\s*)aid_visitor=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
