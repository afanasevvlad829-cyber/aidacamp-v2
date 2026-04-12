#!/usr/bin/env node
/**
 * clarity-export.js
 *
 * Экспорт сессий с dead clicks из Microsoft Clarity.
 * Использует Playwright для навигации по UI Clarity.
 *
 * Первый запуск — откроет браузер для ручного логина,
 * сохранит куки в clarity-auth.json.
 * Последующие запуски — использует сохранённую сессию.
 *
 * Запуск: node scripts/clarity-export.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AUTH_FILE = path.join(__dirname, 'clarity-auth.json');
const OUTPUT_CSV = path.join(ROOT, 'data', 'clarity-sessions.csv');
const CLARITY_URL = 'https://clarity.microsoft.com';
// Clarity project ID for АйДаКемп (w8yoykmszl)
const PROJECT_ID = 'w8yoykmszl';

async function ensureAuth(browser) {
  // Try to use saved auth
  if (fs.existsSync(AUTH_FILE)) {
    console.log('📂 Загружаю сохранённую сессию...');
    const context = await browser.newContext({ storageState: AUTH_FILE });
    const page = await context.newPage();

    await page.goto(`${CLARITY_URL}/projects/view/${PROJECT_ID}/dashboard`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Check if we're logged in by waiting for dashboard or login redirect
    await page.waitForTimeout(3000);
    const url = page.url();

    if (url.includes('/projects/') || url.includes('/dashboard')) {
      console.log('✅ Сессия активна');
      return { context, page };
    }

    console.log('⚠️  Сессия истекла, нужен повторный логин');
    await context.close();
  }

  // Manual login flow
  console.log('\n🔐 Откройте браузер и залогиньтесь в Clarity вручную.');
  console.log('   После логина и перехода в проект скрипт продолжит автоматически.\n');

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(CLARITY_URL, { waitUntil: 'domcontentloaded' });

  // Wait for user to log in — look for project page URL
  console.log('⏳ Жду логин... (перейдите в проект АйДаКемп в открытом браузере)');

  await page.waitForURL(
    (url) =>
      url.href.includes('/projects/') || url.href.includes('/dashboard'),
    { timeout: 300000 } // 5 minutes to log in
  );

  console.log('✅ Логин успешен! Сохраняю сессию...');
  await context.storageState({ path: AUTH_FILE });
  console.log(`💾 Сессия сохранена в ${AUTH_FILE}`);

  return { context, page };
}

async function navigateToRecordings(page) {
  console.log('\n📋 Перехожу в Recordings...');

  // Navigate to recordings page
  const recordingsUrl = `${CLARITY_URL}/projects/view/${PROJECT_ID}/recordings`;
  await page.goto(recordingsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  // Wait for the recordings list to appear
  await page.waitForSelector('[class*="recording"], [class*="session"], table, [role="grid"], [class*="list"]', {
    timeout: 15000,
  }).catch(() => {
    console.log('⚠️  Не удалось найти список записей, пробую продолжить...');
  });
}

async function applyFilters(page) {
  console.log('🔍 Применяю фильтры: Dead clicks = Да, период = 7 дней...');

  // Click on "Add filter" / filter button
  const filterBtn = await page.$('button:has-text("filter"), button:has-text("фильтр"), button:has-text("Filter"), [class*="filter-button"], [data-testid*="filter"]');
  if (filterBtn) {
    await filterBtn.click();
    await page.waitForTimeout(1000);
  }

  // Try to find and click Dead clicks filter
  // Clarity UI uses different filter approaches — try common patterns
  const deadClickSelectors = [
    'text=Dead click',
    'text=dead click',
    'text=Нерезультативн',
    'text=Dead Click',
    '[data-filter*="dead"]',
    '[data-testid*="dead-click"]',
  ];

  let filterApplied = false;
  for (const sel of deadClickSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await page.waitForTimeout(1000);

        // Look for "Yes" / "Да" option
        const yesBtn = await page.$('text=Yes, text=Да, [value="true"], label:has-text("Yes"), label:has-text("Да")');
        if (yesBtn) {
          await yesBtn.click();
          await page.waitForTimeout(500);
        }

        filterApplied = true;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!filterApplied) {
    console.log('⚠️  Не удалось применить фильтр dead clicks через UI.');
    console.log('   Пробую через URL параметры...');

    // Apply filters via URL — Clarity supports URL-based filtering
    const filteredUrl = `${CLARITY_URL}/projects/view/${PROJECT_ID}/recordings?date=Last 7 days&filter=DeadClick%7CYes`;
    await page.goto(filteredUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Set date range to last 7 days if not already set
  const dateSelectors = [
    'text=Last 7 days',
    'text=Последние 7 дней',
    '[class*="date-range"]',
    '[data-testid*="date"]',
  ];

  for (const sel of dateSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await page.waitForTimeout(500);
        break;
      }
    } catch {
      continue;
    }
  }

  console.log('✅ Фильтры применены');
  await page.waitForTimeout(2000);
}

async function sortByClicks(page) {
  console.log('📊 Сортирую по кликам (убывание)...');

  const clickSortSelectors = [
    'th:has-text("Click")',
    'th:has-text("клик")',
    '[class*="header"]:has-text("Click")',
    '[role="columnheader"]:has-text("Click")',
    'text=Click count',
    'text=Кол-во кликов',
  ];

  for (const sel of clickSortSelectors) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await page.waitForTimeout(1000);
        // Click again for descending if needed
        await el.click();
        await page.waitForTimeout(1000);
        console.log('✅ Сортировка применена');
        return;
      }
    } catch {
      continue;
    }
  }

  console.log('⚠️  Не удалось отсортировать, продолжаю с дефолтным порядком');
}

async function collectSessions(page) {
  console.log('\n📥 Собираю данные сессий...');

  const sessions = [];

  // Get all session rows — Clarity uses various row structures
  const rowSelectors = [
    '[class*="recording-row"]',
    '[class*="session-row"]',
    'table tbody tr',
    '[role="row"]',
    '[class*="SessionList"] > div > div',
    '[class*="list-item"]',
    '[class*="recording"] a',
  ];

  let rows = [];
  for (const sel of rowSelectors) {
    rows = await page.$$(sel);
    if (rows.length > 0) {
      console.log(`   Найдено ${rows.length} строк (${sel})`);
      break;
    }
  }

  if (rows.length === 0) {
    // Fallback: try to extract from page content
    console.log('⚠️  Не найдены строки таблицы. Пробую извлечь из DOM...');

    const pageData = await page.evaluate(() => {
      const results = [];
      // Look for session cards or list items with data
      const items = document.querySelectorAll('[class*="session"], [class*="recording"], [class*="card"]');
      items.forEach((item) => {
        const text = item.textContent || '';
        if (text.includes('click') || text.includes('sec') || text.includes('min')) {
          results.push({
            text: text.replace(/\s+/g, ' ').trim().substring(0, 500),
            href: item.querySelector('a')?.href || '',
          });
        }
      });
      return results;
    });

    if (pageData.length > 0) {
      console.log(`   Найдено ${pageData.length} элементов через fallback`);
    }

    // Take a screenshot for debugging
    const debugPath = path.join(ROOT, 'data', 'clarity-debug.png');
    await page.screenshot({ path: debugPath, fullPage: true });
    console.log(`   📸 Скриншот для отладки: ${debugPath}`);
  }

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];

      // Extract metadata from the row
      const rowData = await row.evaluate((el) => {
        const getText = (selector) => {
          const found = el.querySelector(selector);
          return found ? found.textContent.trim() : '';
        };
        const getAllText = () => el.textContent.replace(/\s+/g, ' ').trim();

        return {
          allText: getAllText(),
          href: el.querySelector('a')?.href || el.closest('a')?.href || '',
        };
      });

      // Parse metadata from row text
      const session = parseSessionRow(rowData.allText, rowData.href);
      if (!session.date) session.date = new Date().toISOString().split('T')[0];

      // Try to get share link
      try {
        await row.click();
        await page.waitForTimeout(2000);

        // Look for share button
        const shareBtn = await page.$('[class*="share"], button:has-text("Share"), button:has-text("Поделиться"), [aria-label*="share"], [aria-label*="Share"]');
        if (shareBtn) {
          await shareBtn.click();
          await page.waitForTimeout(1500);

          // Look for copy link button or input with share URL
          const linkInput = await page.$('input[type="text"][value*="clarity"], input[readonly], [class*="share-link"] input');
          if (linkInput) {
            session.share_url = await linkInput.inputValue();
          } else {
            // Try to get from clipboard or visible text
            const shareLink = await page.$('[class*="link"] a, [class*="share"] a, a[href*="clarity.microsoft.com/s/"]');
            if (shareLink) {
              session.share_url = await shareLink.getAttribute('href');
            }
          }

          // Close share modal
          const closeBtn = await page.$('[class*="close"], button:has-text("Close"), button:has-text("Закрыть"), [aria-label="Close"]');
          if (closeBtn) await closeBtn.click();
          await page.waitForTimeout(500);
        }

        // Go back to list
        await page.goBack();
        await page.waitForTimeout(2000);

        // Re-fetch rows after navigation
        for (const sel of rowSelectors) {
          const newRows = await page.$$(sel);
          if (newRows.length > 0) {
            rows = newRows;
            break;
          }
        }
      } catch (err) {
        console.log(`   ⚠️  Не удалось получить share link для сессии ${i + 1}`);
      }

      sessions.push(session);
      process.stdout.write(`   Сессия ${i + 1}/${rows.length}\r`);
    } catch (err) {
      console.log(`   ⚠️  Ошибка в сессии ${i + 1}: ${err.message}`);
    }
  }

  console.log(`\n✅ Собрано ${sessions.length} сессий`);
  return sessions;
}

function parseSessionRow(text, href) {
  const session = {
    date: '',
    browser: '',
    device: '',
    country: '',
    url_entry: '',
    url_exit: '',
    duration: '',
    clicks: '',
    referrer: '',
    share_url: href || '',
  };

  // Try to extract duration (e.g., "2m 30s", "45s", "1:30")
  const durationMatch = text.match(/(\d+m\s*\d*s|\d+:\d{2}:\d{2}|\d+:\d{2}|\d+\s*min|\d+s)/i);
  if (durationMatch) session.duration = durationMatch[1];

  // Try to extract clicks count
  const clickMatch = text.match(/(\d+)\s*(click|клик)/i);
  if (clickMatch) session.clicks = clickMatch[1];

  // Try to extract browser
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Samsung'];
  for (const b of browsers) {
    if (text.includes(b)) {
      session.browser = b;
      break;
    }
  }

  // Try to extract device
  const devices = ['Desktop', 'Mobile', 'Tablet', 'Десктоп', 'Мобильный', 'Планшет'];
  for (const d of devices) {
    if (text.includes(d)) {
      session.device = d;
      break;
    }
  }

  // Try to extract country
  const countryMatch = text.match(/(Russia|United States|Germany|France|India|China|Россия|США)/i);
  if (countryMatch) session.country = countryMatch[1];

  // Try to extract URLs
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/g);
  if (urlMatch) {
    session.url_entry = urlMatch[0] || '';
    session.url_exit = urlMatch[1] || urlMatch[0] || '';
  }

  // Try to extract date
  const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
  if (dateMatch) session.date = dateMatch[1];

  // Pages from path patterns
  const pageMatch = text.match(/\/([\w\-\/]+)/g);
  if (pageMatch && !session.url_entry) {
    session.url_entry = pageMatch[0] || '';
  }

  return session;
}

function saveToCSV(sessions) {
  const dir = path.dirname(OUTPUT_CSV);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const headers = ['date', 'browser', 'device', 'country', 'url_entry', 'url_exit', 'duration', 'clicks', 'referrer', 'share_url'];
  const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];

  for (const s of sessions) {
    lines.push(headers.map((h) => escape(s[h])).join(','));
  }

  fs.writeFileSync(OUTPUT_CSV, lines.join('\n'), 'utf-8');
  console.log(`\n💾 Сохранено в ${OUTPUT_CSV}`);
}

function printSummary(sessions) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 СВОДКА');
  console.log('='.repeat(50));
  console.log(`Всего сессий: ${sessions.length}`);

  // Top 5 pages by dead clicks
  const pageCounts = {};
  for (const s of sessions) {
    const url = s.url_entry || 'unknown';
    const clicks = parseInt(s.clicks) || 0;
    pageCounts[url] = (pageCounts[url] || 0) + clicks;
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n🔝 Топ-5 страниц по dead clicks:');
  topPages.forEach(([url, count], i) => {
    console.log(`   ${i + 1}. ${url} — ${count} кликов`);
  });

  // Top 3 browsers
  const browserCounts = {};
  for (const s of sessions) {
    const browser = s.browser || 'unknown';
    browserCounts[browser] = (browserCounts[browser] || 0) + 1;
  }
  const topBrowsers = Object.entries(browserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  console.log('\n🌐 Топ-3 браузера с dead clicks:');
  topBrowsers.forEach(([browser, count], i) => {
    console.log(`   ${i + 1}. ${browser} — ${count} сессий`);
  });

  console.log('\n' + '='.repeat(50));
}

async function main() {
  console.log('🚀 Clarity Dead Clicks Export');
  console.log('='.repeat(50));

  const browser = await chromium.launch({
    headless: false, // Need visible browser for login
    args: ['--no-sandbox'],
  });

  try {
    const { context, page } = await ensureAuth(browser);

    await navigateToRecordings(page);
    await applyFilters(page);
    await sortByClicks(page);

    const sessions = await collectSessions(page);

    if (sessions.length > 0) {
      saveToCSV(sessions);
      printSummary(sessions);
    } else {
      console.log('\n⚠️  Не удалось собрать сессии.');
      console.log('   Возможные причины:');
      console.log('   - Clarity изменил UI');
      console.log('   - Нет сессий с dead clicks за последние 7 дней');
      console.log('   - Нужно проверить скриншот в data/clarity-debug.png');

      // Save debug screenshot
      const debugPath = path.join(ROOT, 'data', 'clarity-debug.png');
      await page.screenshot({ path: debugPath, fullPage: true });
      console.log(`   📸 Скриншот: ${debugPath}`);
    }

    // Save updated auth
    await context.storageState({ path: AUTH_FILE });

    await context.close();
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
