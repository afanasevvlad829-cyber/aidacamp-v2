/** Format raw phone input to +7 (XXX) XXX-XX-XX */
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

/** Check if phone has exactly 11 digits starting with 7 */
export function isPhoneValid(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('7');
}

/** Attach formatting to a phone input element */
export function initPhoneInput(input: HTMLInputElement): void {
  input.addEventListener('input', () => {
    const pos = input.selectionStart || 0;
    const before = input.value.length;
    input.value = formatPhone(input.value);
    const after = input.value.length;
    input.setSelectionRange(pos + (after - before), pos + (after - before));
  });
}
