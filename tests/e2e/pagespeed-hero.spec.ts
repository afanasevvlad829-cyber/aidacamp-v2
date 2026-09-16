import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }, viewport: { width: 412, height: 844 }, deviceScaleFactor: 1.75, isMobile: true });
test('mobile hero loads one responsive image and back-to-top remains functional', async ({ page }) => {
  const images: string[] = [];
  page.on('request', request => {
    if (/\/(?:images|optimized-media)\/hero-mobile-.*\.(avif|webp)/.test(request.url())) images.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('link[rel=preload][as=font]')).toHaveCount(0);
  const otherPage = await page.request.get('/ceny/');
  expect((await otherPage.text()).match(/<link[^>]*rel=preload[^>]*as=font[^>]*>/g)).toHaveLength(2);
  const hero = page.locator('#hero-mobile-photo');
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('hero-mobile-optimized-828.avif');
  expect(images).toHaveLength(1);
  await expect(hero).toHaveCSS('opacity', '1');
  const thumbnails = page.locator('picture source[srcset*="proto-smena"]');
  expect(await thumbnails.count()).toBeGreaterThan(0);
  for (const source of await thumbnails.all()) {
    const img = source.locator('..').locator('img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    expect(await img.evaluate((el: HTMLImageElement) => el.currentSrc)).toContain('/optimized-media/');
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  const back = page.locator('#back-to-top-btn');
  await expect(back).toBeHidden();
  await page.evaluate(() => window.scrollTo(0, 1100));
  await expect(back).toBeVisible();
  await back.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(back).toBeHidden();
});

test('returning visitor reaches the viewed shift once across page lifecycle events', async ({ page }) => {
  await page.goto('/');
  const shiftId = await page.locator('[data-shifts-marquee-track] [data-shift-id]').first().getAttribute('data-shift-id');
  expect(shiftId).toBeTruthy();
  await page.evaluate(id => {
    localStorage.setItem('ac:viewed_shifts', JSON.stringify([{ id, ts: Date.now() }]));
    sessionStorage.removeItem('ac:scroll_done');
  }, shiftId);
  await page.addInitScript(() => {
    (window as any).shiftsScrollCalls = 0;
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (this.id === 'shifts') (window as any).shiftsScrollCalls++;
      return original.call(this, options);
    };
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => (window as any).shiftsScrollCalls)).toBe(1);
  await page.evaluate(() => document.dispatchEvent(new Event('astro:page-load')));
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as any).shiftsScrollCalls)).toBe(1);
  expect(await page.evaluate(() => sessionStorage.getItem('ac:scroll_done'))).toBe('1');
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
