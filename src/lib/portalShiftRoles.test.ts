import { describe, it, expect } from 'vitest';
import { roleAllowed } from './portalShiftRoles';
describe('roleAllowed', () => {
  it('пускает, если роль в списке', () => { expect(roleAllowed('vozhaty', ['vozhaty','teacher'])).toBe(true); });
  it('admin проходит всегда', () => { expect(roleAllowed('admin', ['vozhaty'])).toBe(true); });
  it('не пускает чужую роль', () => { expect(roleAllowed('student', ['vozhaty'])).toBe(false); });
  it('пустой список ролей = никому (кроме admin)', () => { expect(roleAllowed('vozhaty', [])).toBe(false); expect(roleAllowed('admin', [])).toBe(true); });
});
