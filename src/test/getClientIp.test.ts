import { describe, it, expect } from 'vitest';
import { getClientIp } from '../middleware';

// Живёт в src/test/ (НЕ под src/pages/) — правило про Astro и .test.ts
// (см. feedback_astro_no_tests_under_pages).
//
// Контекст бага: nginx (location ^~ /api/) шлёт
//   X-Real-IP: $remote_addr                     — nginx ПЕРЕЗАПИСЫВАЕТ, не подделать
//   X-Forwarded-For: $proxy_add_x_forwarded_for  — nginx ДОПИСЫВАЕТ реальный IP в конец
// Старый код брал X-Forwarded-For.split(',')[0] — клиент-контролируемый элемент,
// это тривиально обходило rate-limit на /api/ask, /api/lead, /api/contact-send.

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/lead', { headers });
}

describe('getClientIp', () => {
  it('доверяет X-Real-IP (не подделываемый nginx-заголовок), игнорируя XFF', () => {
    // Ровно то, что реально шлёт nginx: X-Real-IP настоящий, XFF — то, что подделал клиент.
    const ip = getClientIp(req({
      'x-real-ip': '203.0.113.9',
      'x-forwarded-for': '1.2.3.4', // подделанное клиентом значение
    }));
    expect(ip).toBe('203.0.113.9');
  });

  it('подделка X-Forwarded-For клиентом больше не меняет вычисленный IP (эксплойт закрыт)', () => {
    const real = '203.0.113.9';
    const ip1 = getClientIp(req({ 'x-real-ip': real, 'x-forwarded-for': '1.1.1.1' }));
    const ip2 = getClientIp(req({ 'x-real-ip': real, 'x-forwarded-for': '9.9.9.9' }));
    // Раньше (баг): ip1 !== ip2, т.к. брался первый элемент XFF (подделанный).
    expect(ip1).toBe(ip2);
    expect(ip1).toBe(real);
  });

  it('без X-Real-IP — фолбэк на ПОСЛЕДНИЙ элемент XFF (ближе к серверу), не первый', () => {
    const ip = getClientIp(req({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' }));
    expect(ip).toBe('203.0.113.9');
  });

  it('без обоих заголовков — unknown, не падает', () => {
    expect(getClientIp(req({}))).toBe('unknown');
  });
});
