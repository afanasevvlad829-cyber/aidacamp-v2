const MONTHS_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

/** Форматирует дату ISO (YYYY-MM-DD) в «3 июня» */
export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Number(m[3]) + ' ' + MONTHS_RU[Number(m[2]) - 1] : iso;
}

/** Форматирует время HH:MM:SS или null → «HH:MM» */
export function fmtTime(t: string | null): string {
  return t ? t.slice(0, 5) : '';
}

/** Форматирует ISO datetime → «день.месяц час:мин» (для MediaManager) */
export function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/** Форматирует размер файла в байтах → «1.2 MB» */
export function fmtSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
