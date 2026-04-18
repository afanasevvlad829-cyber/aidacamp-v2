/**
 * Шаг 1 — запустить с Mac, залогиниться в Директ, сохранить сессию
 * Запуск: node scripts/direct-login-local.js
 * После логина сессия сохранится и будет скопирована на сервер
 */

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SESSION_FILE = path.join(__dirname, '../.direct-session.json');
const SERVER = 'root@159.194.223.55';
const SSH_KEY = `${process.env.HOME}/.ssh/aidacamp_prod`;
const REMOTE_SESSION = '/opt/browser-agent/sessions/direct.json';

(async () => {
  console.log('🚀 Открываю браузер для логина в Яндекс Директ...');

  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ru-RU',
  });

  const page = await ctx.newPage();
  await page.goto('https://passport.yandex.ru/auth?retpath=https%3A%2F%2Fdirect.yandex.ru%2F');

  console.log('');
  console.log('⏳ Залогинься в браузере под аккаунтом kv145');
  console.log('⏳ После того как откроется Директ — нажми Enter здесь');
  console.log('');

  await new Promise(resolve => process.stdin.once('data', resolve));

  // Проверяем что мы в Директе
  const url = page.url();
  console.log(`Текущий URL: ${url}`);

  if (url.includes('passport') || url.includes('login')) {
    console.error('❌ Похоже ты ещё не залогинился. Попробуй ещё раз.');
    await browser.close();
    process.exit(1);
  }

  // Сохраняем сессию локально
  const storage = await ctx.storageState();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2));
  console.log(`✅ Сессия сохранена локально: ${SESSION_FILE}`);

  await browser.close();

  // Копируем на сервер
  console.log('📤 Копирую сессию на сервер...');
  try {
    execSync(`ssh -i ${SSH_KEY} ${SERVER} "mkdir -p /opt/browser-agent/sessions"`);
    execSync(`scp -i ${SSH_KEY} ${SESSION_FILE} ${SERVER}:${REMOTE_SESSION}`);
    console.log(`✅ Сессия скопирована на сервер: ${REMOTE_SESSION}`);
    console.log('');
    console.log('🎉 Готово! Теперь запусти на сервере:');
    console.log('   node /opt/browser-agent/direct-carousel.js');
  } catch (e) {
    console.error('❌ Ошибка копирования на сервер:', e.message);
    console.log(`Скопируй вручную: scp ${SESSION_FILE} ${SERVER}:${REMOTE_SESSION}`);
  }
})();
