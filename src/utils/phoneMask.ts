/**
 * Форматирует строку в российский номер телефона: +7 (XXX) XXX-XX-XX
 * Используется в LeadForm и ShiftBookModal.
 */
export function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length > 1) digits = '7' + digits.slice(1);
  if (!digits.startsWith('7') && digits.length > 0) digits = '7' + digits;
  digits = digits.slice(0, 11);

  if (digits.length === 0) return '';
  let out = '+7';
  if (digits.length > 1) out += ' (' + digits.slice(1, 4);
  if (digits.length >= 4) out += ') ' + digits.slice(4, 7);
  if (digits.length >= 7) out += '-' + digits.slice(7, 9);
  if (digits.length >= 9) out += '-' + digits.slice(9, 11);
  return out;
}

export function isPhoneValid(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('7');
}
