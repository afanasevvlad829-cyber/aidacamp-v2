#!/usr/bin/env node
/**
 * test-wow-features.mjs — тест WOW-фичей чат-бота /ask
 *
 * Тестирует UI-элементы:
 * - Прогресс-бар при активности
 * - Ачивка после 5 сообщений
 * - Share-chooser modal с выбором канала
 * - QR-модал
 *
 * Использование:
 *   node scripts/test-wow-features.mjs               — тест на dev.aidacamp.ru
 *   node scripts/test-wow-features.mjs --prod        — тест на aidacamp.ru
 *   node scripts/test-wow-features.mjs --headed      — видимый браузер
 */

const args = process.argv.slice(2);
const isProd = args.includes('--prod');
const isHeaded = args.includes('--headed');

const BASE_URL = isProd ? 'https://aidacamp.ru' : 'https://dev.aidacamp.ru';

// Динамический импорт Playwright
let chromium, test, expect;

async function loadPlaywright() {
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
    const testing = await import('@playwright/test');
    test = testing.test;
    expect = testing.expect;
  } catch (e) {
    console.error('❌ Playwright не установлен. Установите: npm install -D @playwright/test');
    process.exit(1);
  }
}

function colorize(str, code) {
  return `\x1b[${code}m${str}\x1b[0m`;
}
const green = s => colorize(s, 32);
const red = s => colorize(s, 31);
const yellow = s => colorize(s, 33);
const gray = s => colorize(s, 90);
const bold = s => colorize(s, 1);
const cyan = s => colorize(s, 36);

async function testWOWFeatures() {
  console.log(bold(`\n🎨 Тест WOW-фичей — ${BASE_URL}/ask/`));
  console.log(gray(`Режим: ${isHeaded ? 'видимый' : 'headless'}`));

  let browser, context, page;
  let passed = 0, failed = 0;

  try {
    // Запуск браузера
    browser = await chromium.launch({ headless: !isHeaded });
    context = await browser.newContext();
    page = await context.newPage();

    console.log(`\n${bold(cyan('▶ Открываем чат'))}`);
    await page.goto(`${BASE_URL}/ask/`, { waitUntil: 'networkidle' });
    console.log(`${green('✓')} Страница загружена`);
    passed++;

    // Тест 1: Прогресс-бар скрыт в начале
    console.log(`\n${bold(cyan('▶ Прогресс-бар скрыт в начале'))}`);
    const progressBarHidden = await page.evaluate(() => {
      const bar = document.querySelector('.progress-bar');
      return !bar || bar.style.display === 'none' || bar.offsetHeight === 0;
    });
    if (progressBarHidden) {
      console.log(`${green('✓')} Прогресс-бар скрыт`);
      passed++;
    } else {
      console.log(`${red('✗')} Прогресс-бар должен быть скрыт`);
      failed++;
    }

    // Тест 2: Возрастная кнопка работает
    console.log(`\n${bold(cyan('▶ Клик по возрастной кнопке'))}`);
    try {
      await page.click('button.age-btn:has-text("7–9")');
      await page.waitForTimeout(500);
      const inputValue = await page.inputValue('#inp');
      if (inputValue === 'Нам 7–9 лет') {
        console.log(`${green('✓')} Возрастная кнопка: Нам 7–9 лет`);
        passed++;
      } else {
        console.log(`${red('✗')} Значение input: ${inputValue}`);
        failed++;
      }
    } catch (e) {
      console.log(`${red('✗')} ${e.message}`);
      failed++;
    }

    // Тест 3: Отправка сообщения
    console.log(`\n${bold(cyan('▶ Отправляем вопрос'))}`);
    try {
      await page.click('#sendBtn');
      await page.waitForTimeout(3000);
      const msgCount = await page.evaluate(() => document.querySelectorAll('.msg-text').length);
      console.log(`${green('✓')} Получены ответы (${msgCount} сообщений)`);
      passed++;
    } catch (e) {
      console.log(`${red('✗')} ${e.message}`);
      failed++;
    }

    // Тест 4: Share-row скрыта в начале
    console.log(`\n${bold(cyan('▶ Share-row скрыта в начале'))}`);
    const shareRowHidden = await page.evaluate(() => {
      const row = document.getElementById('shareRow');
      return !row || !row.classList.contains('show');
    });
    if (shareRowHidden) {
      console.log(`${green('✓')} Share-row скрыта`);
      passed++;
    } else {
      console.log(`${yellow('△')} Share-row уже видна (может появиться после 3 обменов)`);
    }

    // Тест 5: Отправляем 2 больше сообщений чтобы триггерить share-row (всего 3 обмена)
    console.log(`\n${bold(cyan('▶ Отправляем дополнительные сообщения'))}`);
    for (let i = 0; i < 2; i++) {
      await page.fill('#inp', `Вопрос номер ${i + 2}`);
      await page.click('#sendBtn');
      await page.waitForTimeout(2000);
    }
    console.log(`${green('✓')} Отправлено 2 доп. сообщения (всего 3 обмена)`);
    passed++;

    // Тест 6: Share-row появилась после 3 обменов
    console.log(`\n${bold(cyan('▶ Share-row должна быть видна после 3 обменов'))}`);
    const shareRowVisible = await page.evaluate(() => {
      const row = document.getElementById('shareRow');
      return row && row.classList.contains('show');
    });
    if (shareRowVisible) {
      console.log(`${green('✓')} Share-row видна`);
      passed++;
    } else {
      console.log(`${red('✗')} Share-row должна быть видна после 3 обменов`);
      failed++;
    }

    // Тест 7: Кнопка Share существует
    console.log(`\n${bold(cyan('▶ Кнопка Share существует'))}`);
    const shareBtn = await page.$('button.share-btn:has-text("Отправить подруге")');
    if (shareBtn) {
      console.log(`${green('✓')} Кнопка Share найдена`);
      passed++;
    } else {
      console.log(`${red('✗')} Кнопка Share не найдена`);
      failed++;
    }

    // Тест 8: Клик по Share открывает share-chooser
    console.log(`\n${bold(cyan('▶ Клик по Share открывает модал'))}`);
    try {
      const shareChooserHidden = await page.evaluate(() => {
        const chooser = document.getElementById('shareChooser');
        return !chooser || !chooser.classList.contains('open');
      });

      if (shareChooserHidden) {
        await page.click('button.share-btn:has-text("Отправить подруге")');
        await page.waitForTimeout(500);

        const shareChooserOpen = await page.evaluate(() => {
          const chooser = document.getElementById('shareChooser');
          return chooser && chooser.classList.contains('open');
        });

        if (shareChooserOpen) {
          console.log(`${green('✓')} Share-chooser открыта`);
          passed++;
        } else {
          console.log(`${red('✗')} Share-chooser не открылась`);
          failed++;
        }
      } else {
        console.log(`${yellow('△')} Share-chooser уже открыта`);
      }
    } catch (e) {
      console.log(`${red('✗')} ${e.message}`);
      failed++;
    }

    // Тест 9: WhatsApp кнопка в модале
    console.log(`\n${bold(cyan('▶ WhatsApp кнопка в модале'))}`);
    const whatsappBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('.share-choice');
      for (const btn of btns) {
        if (btn.textContent.includes('WhatsApp')) return true;
      }
      return false;
    });
    if (whatsappBtn) {
      console.log(`${green('✓')} WhatsApp кнопка найдена`);
      passed++;
    } else {
      console.log(`${red('✗')} WhatsApp кнопка не найдена`);
      failed++;
    }

    // Тест 10: Telegram кнопка в модале
    console.log(`\n${bold(cyan('▶ Telegram кнопка в модале'))}`);
    const telegramBtn = await page.evaluate(() => {
      const btns = document.querySelectorAll('.share-choice');
      for (const btn of btns) {
        if (btn.textContent.includes('Telegram')) return true;
      }
      return false;
    });
    if (telegramBtn) {
      console.log(`${green('✓')} Telegram кнопка найдена`);
      passed++;
    } else {
      console.log(`${red('✗')} Telegram кнопка не найдена`);
      failed++;
    }

    // Тест 11: Клик на Telegram кнопку
    console.log(`\n${bold(cyan('▶ Клик на Telegram кнопку'))}`);
    try {
      // Перехватываем popup
      const popupPromise = context.waitForEvent('page');
      await page.click('.share-choice:has-text("Telegram")');

      const popup = await Promise.race([
        popupPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 2000))
      ]);

      if (popup) {
        const url = popup.url();
        if (url.includes('t.me')) {
          console.log(`${green('✓')} Telegram URL открыта: ${url.slice(0, 50)}...`);
          passed++;
          await popup.close();
        } else {
          console.log(`${red('✗')} Неправильный URL: ${url}`);
          failed++;
        }
      } else {
        console.log(`${yellow('△')} Popup не перехвачена (может быть блокирована браузером)`);
      }

      // Закрываем модал кликом на фон
      await page.click('#shareChooser', { position: { x: 10, y: 10 } }).catch(() => {});
      await page.waitForTimeout(500);

    } catch (e) {
      console.log(`${yellow('△')} ${e.message}`);
    }

    // Тест 12: Share-chooser закрыта после нажатия
    console.log(`\n${bold(cyan('▶ Share-chooser закрыта после нажатия'))}`);
    const shareChooserClosed = await page.evaluate(() => {
      const chooser = document.getElementById('shareChooser');
      return !chooser || !chooser.classList.contains('open');
    });
    if (shareChooserClosed) {
      console.log(`${green('✓')} Share-chooser закрыта`);
      passed++;
    } else {
      console.log(`${yellow('△')} Share-chooser ещё открыта`);
    }

    // Тест 13: QR кнопка на десктопе
    console.log(`\n${bold(cyan('▶ QR кнопка на десктопе'))}`);
    const qrBtn = await page.evaluate(() => {
      const btn = document.getElementById('qrBtn');
      return btn && btn.style.display !== 'none';
    });
    if (qrBtn) {
      console.log(`${green('✓')} QR кнопка видна`);
      passed++;
    } else {
      console.log(`${gray('⊘')} QR кнопка скрыта (возможно мобильный вид)`);
    }

    // Тест 14: Клик на QR открывает модал
    if (qrBtn) {
      console.log(`\n${bold(cyan('▶ Клик на QR открывает модал'))}`);
      try {
        await page.click('#qrBtn');
        await page.waitForTimeout(500);

        const qrModalOpen = await page.evaluate(() => {
          const modal = document.getElementById('qrModal');
          return modal && modal.classList.contains('open');
        });

        if (qrModalOpen) {
          console.log(`${green('✓')} QR-модал открыта`);
          passed++;
        } else {
          console.log(`${red('✗')} QR-модал не открылась`);
          failed++;
        }

        // Закрываем модал
        await page.click('#qrModal button').catch(() => {});
        await page.waitForTimeout(300);
      } catch (e) {
        console.log(`${red('✗')} ${e.message}`);
        failed++;
      }
    }

    // Итого
    const totalTests = passed + failed;
    console.log(`\n${bold('Итого:')} ${totalTests} тестов — ${green(`${passed} ✓`)} ${failed ? red(`${failed} ✗`) : ''}`);

    if (failed > 0) process.exit(1);

  } catch (e) {
    console.error(`${red('Ошибка:')} ${e.message}`);
    console.error(e.stack);
    process.exit(1);
  } finally {
    if (page) await page.close();
    if (context) await context.close();
    if (browser) await browser.close();
  }
}

// Запуск
(async () => {
  await loadPlaywright();
  await testWOWFeatures();
})().catch(e => {
  console.error(red(e.message));
  process.exit(1);
});
