import { test, expect } from '@playwright/test';

test.use({ launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }, viewport: { width: 412, height: 844 }, deviceScaleFactor: 1.75, isMobile: true });
test('mobile hero loads one responsive image and back-to-top remains functional', async ({ page }) => {
  const images: string[] = [];
  page.on('request', request => {
    if (/\/(?:images|optimized-media)\/hero-mobile-.*\.(avif|webp)/.test(request.url())) images.push(request.url());
  });
  await page.goto('/');
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
