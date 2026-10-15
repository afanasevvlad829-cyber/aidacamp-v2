export function safeLoginDestination(rawNext: string, role: string): string {
  if (rawNext.startsWith('/portal')) return rawNext;
  try {
    const target = new URL(rawNext);
    if (
      target.origin === 'https://ai.aidaplus.ru' ||
      target.origin === 'https://ai.aidacamp.ru'
    ) return target.toString();
  } catch {
    // Invalid or relative non-portal destinations fall back below.
  }
  return role === 'student' ? 'https://ai.aidaplus.ru/' : '/portal/';
}
