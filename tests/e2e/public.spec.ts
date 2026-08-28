import { expect, test } from '@playwright/test';

const routes = ['/', '/ceny/', '/detskiy-lager/', '/ai-lager/', '/stati/'];

for (const route of routes) {
  test(`public smoke: ${route}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBeLessThan(400);
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('main').first()).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });
}
