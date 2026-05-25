import { test, expect, type Page } from '@playwright/test';

/**
 * E2E suite for the login-gated portal at /portal/.
 * Runs against the LIVE dev site (see playwright.config.ts baseURL).
 * Passwords default to the live DEV values so the suite runs out of the box.
 */
const STUDENT_PW = process.env.PORTAL_E2E_STUDENT_PW ?? 'robocode-8510';
const TEACHER_PW = process.env.PORTAL_E2E_TEACHER_PW ?? 'uchitel-6525';

/** Log in via the login page UI and wait until landed on the hub. */
async function login(page: Page, password: string) {
  await page.goto('/portal/login');
  await page.locator('input[name=password]').fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();
  await expect(page).toHaveURL(/\/portal\/?$/);
}

test('A: unauthenticated visit redirects to login', async ({ page }) => {
  await page.goto('/portal/');
  await expect(page).toHaveURL(/\/portal\/login/);
});

test('B: student sees polygon but not teacher section', async ({ page }) => {
  await login(page, STUDENT_PW);
  await expect(page.getByText('Танковый полигон')).toBeVisible();
  await expect(page.getByText('Учителю')).toHaveCount(0);
});

test('C: teacher sees teacher section', async ({ page }) => {
  await login(page, TEACHER_PW);
  await expect(page.getByText('Учителю').first()).toBeVisible();
});

test('D: logout closes access', async ({ page }) => {
  await login(page, STUDENT_PW);
  await page.getByRole('button', { name: 'Выйти' }).click();
  await page.goto('/portal/');
  await expect(page).toHaveURL(/\/portal\/login/);
});

test('E: search box present on hub', async ({ page }) => {
  await login(page, STUDENT_PW);
  await expect(page.getByPlaceholder(/Поиск по материалам/)).toBeVisible();
});
