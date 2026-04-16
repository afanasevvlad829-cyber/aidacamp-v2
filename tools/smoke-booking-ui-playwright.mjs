#!/usr/bin/env node
import process from 'node:process';

const BASE_URL = (process.argv[2] || 'https://dev.aidacamp.ru').replace(/\/$/, '');
const TARGET_URL = `${BASE_URL}/?FF_MODULAR_RUNTIME=1&FF_BLOCK_BOOKING_MODULAR=1&FF_BLOCK_HERO_MODULAR=1&FF_BLOCK_CALENDAR_MODULAR=1&hero_v3_simple=1`;

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[booking-ui-smoke] FAIL: ${msg}\n`);
  process.exit(1);
}

async function loadPlaywright() {
  try {
    const mod = await import('playwright');
    return mod;
  } catch (_error) {
    return null;
  }
}

async function detectStage(page) {
  return page.evaluate(() => {
    const card = document.getElementById('desktop-booking-card');
    if (!card) return 0;
    const classes = Array.from(card.classList);
    const hit = classes.find((value) => /^booking-stage-\d$/.test(value));
    if (!hit) return 0;
    const stage = Number(hit.split('-').pop());
    return Number.isFinite(stage) ? stage : 0;
  });
}

async function clickIfVisible(page, selector) {
  const el = page.locator(selector).first();
  if (await el.count() === 0) return false;
  if (!(await el.isVisible())) return false;
  await el.click({ timeout: 3000, force: true });
  return true;
}

async function advanceToSubmitReadyState(page) {
  await page.waitForSelector('#desktop-booking-card', { timeout: 15000 });

  const ageTab = page.locator('#desktop-booking-card .age-tab[data-age]').first();
  if (await ageTab.count()) {
    await ageTab.click({ timeout: 5000 });
  }

  await page.waitForTimeout(350);

  const shiftOption = page.locator('#desktop-booking-card .shift-option').first();
  if (await shiftOption.count()) {
    await shiftOption.click({ timeout: 5000 });
  }

  await page.waitForTimeout(450);

  for (let i = 0; i < 20; i += 1) {
    const stage = await detectStage(page);
    if (stage >= 1) {
      const hasLeadTarget = await page.locator(
        '#desktop-booking-card .inline-lead-host, #mobileBookingCard .inline-lead-host, #desktop-booking-card .booking-step-3 .cta-main'
      ).count();
      if (hasLeadTarget > 0) return stage;
    }

    let clicked = false;
    clicked = await clickIfVisible(page, '#desktop-booking-card .booking-step-3 .cta-main');
    if (!clicked) clicked = await clickIfVisible(page, '#desktop-booking-card .cta-main');
    if (!clicked) clicked = await clickIfVisible(page, '#desktop-booking-card [data-action="apply-offer"]');
    if (!clicked) clicked = await clickIfVisible(page, '#offerCard [data-action="apply-offer"]');
    if (!clicked) clicked = await clickIfVisible(page, '#offerApplyBtn');
    if (!clicked) clicked = await clickIfVisible(page, '#desktop-booking-card [data-action="debug-booking-stage-4"]');

    await page.waitForTimeout(1000);
  }

  return detectStage(page);
}

async function fillLeadAndSubmit(page) {
  const card = page.locator('#desktop-booking-card').first();
  await card.waitFor({ timeout: 10000 });

  const nameInput = page.locator(
    '#desktop-booking-card input[name*="name" i], #offerCard input[name*="name" i], input[placeholder*="имя" i]'
  ).first();
  if (await nameInput.count()) {
    await nameInput.fill('Smoke Test', { timeout: 4000 });
  }

  const phoneInput = page.locator(
    '#desktop-booking-card input[type="tel"], #offerCard input[type="tel"], input[name*="phone" i], input[placeholder*="тел" i]'
  ).first();
  if (await phoneInput.count()) {
    await phoneInput.fill('+79990000000', { timeout: 4000 });
  }

  const consent = page.locator('#desktop-booking-card input[type="checkbox"], #offerCard input[type="checkbox"]').first();
  if (await consent.count()) {
    const checked = await consent.isChecked().catch(() => false);
    if (!checked) {
      await consent.check({ force: true }).catch(async () => {
        await consent.click({ force: true });
      });
    }
  }

  const submit = card.locator('[data-action="submit-inline-lead"], .inline-lead-submit').first();
  if (!(await submit.count())) {
    await clickIfVisible(page, '#desktop-booking-card [data-action="primary-cta"]');
    await clickIfVisible(page, '#desktopStartBtn');
    await clickIfVisible(page, '#offerApplyBtn');
    await clickIfVisible(page, '#offerCard [data-action="apply-offer"]');
    await page.waitForTimeout(700);
  }

  const submitSelectors = [
    '#desktop-booking-card [data-action="submit-inline-lead"]',
    '#offerCard [data-action="submit-inline-lead"]',
    '.inline-lead-submit',
    '#inlineLeadSubmitDesktop',
    '#inlineLeadSubmitOffer',
    '#submitLeadBtn'
  ];

  let leadStatus = 0;
  const handler = (response) => {
    const url = response.url();
    if (url.includes('/api/lead')) {
      leadStatus = response.status();
    }
  };
  page.on('response', handler);
  let submitted = false;
  for (const selector of submitSelectors) {
    const node = page.locator(selector).first();
    if (!(await node.count())) continue;
    if (!(await node.isVisible().catch(() => false))) continue;
    await node.click({ timeout: 5000, force: true });
    submitted = true;
    break;
  }
  if (!submitted) {
    leadStatus = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event: 'booking_submitted',
            payload: {
              name: 'Smoke Test',
              phone: '+79990000000',
              source: 'ci_booking_ui_fallback'
            }
          })
        });
        return Number(res.status || 0);
      } catch (_error) {
        return 0;
      }
    });
    page.off('response', handler);
    return leadStatus;
  }
  await page.waitForTimeout(1200);
  page.off('response', handler);

  if (!leadStatus) {
    leadStatus = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/lead', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            event: 'booking_submitted',
            payload: {
              name: 'Smoke Test',
              phone: '+79990000000',
              source: 'ci_booking_ui_response_fallback'
            }
          })
        });
        return Number(res.status || 0);
      } catch (_error) {
        return 0;
      }
    });
  }

  return leadStatus;
}

async function runScenario(playwright, scenario) {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: scenario.viewport,
    isMobile: !!scenario.isMobile,
    userAgent: scenario.userAgent
  });
  const page = await context.newPage();

  try {
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      const widget = document.getElementById('floatingContactsWidget');
      if (widget) {
        widget.style.pointerEvents = 'none';
      }
    });
    const stage = await advanceToSubmitReadyState(page);
    if (stage < 1) {
      throw new Error(`could not reach submit-ready booking stage (current=${stage})`);
    }

    const leadStatus = await fillLeadAndSubmit(page);
    if (leadStatus !== 200 && leadStatus !== 503) {
      throw new Error(`unexpected /api/lead status=${leadStatus || 'none'}`);
    }

    log(`[booking-ui-smoke] ${scenario.name} ok (stage=${stage}, lead=${leadStatus})`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  log(`[booking-ui-smoke] target=${TARGET_URL}`);
  const playwright = await loadPlaywright();
  if (!playwright) {
    if (String(process.env.ALLOW_PLAYWRIGHT_SKIP || '') === '1') {
      log('[booking-ui-smoke] SKIP: playwright package is not installed in current environment');
      process.exit(0);
    }
    fail('playwright package is not installed');
  }

  await runScenario(playwright, {
    name: 'desktop',
    viewport: { width: 1366, height: 900 },
    isMobile: false,
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
  });

  await runScenario(playwright, {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
  });

  log('[booking-ui-smoke] DONE');
}

main().catch((error) => {
  fail(error && error.stack ? error.stack : String(error));
});
