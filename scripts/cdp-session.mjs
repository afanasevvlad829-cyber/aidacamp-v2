import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

const SESSION_FILE = new URL('../.direct-session.json', import.meta.url).pathname;
const SERVER = 'root@159.194.223.55';
const SSH_KEY = `${process.env.HOME}/.ssh/aidacamp_prod`;
const REMOTE = '/opt/browser-agent/sessions/direct.json';

try {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();
  const page = pages.length > 0 ? pages[0] : await ctx.newPage();

  const currentUrl = page.url();
  console.log('Текущий URL:', currentUrl);

  // Если не на Директе вообще — переходим
  if (!currentUrl.includes('yandex.ru')) {
    await page.goto('https://direct.yandex.ru/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
  }

  const finalUrl = page.url();
  console.log('URL:', finalUrl);

  // Проверяем только паспорт/логин — НЕ Директ тоже ок
  if (finalUrl.includes('passport.yandex') && finalUrl.includes('auth')) {
    console.log('⚠️  Нужен логин. Залогинься в Chrome и запусти снова.');
    await browser.close();
    process.exit(1);
  }

  console.log('✅ Сессия активна, сохраняю...');

  // Сохраняем сессию
  const storage = await ctx.storageState();
  writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2));
  console.log(`✅ Сессия: ${storage.cookies.length} cookies, ${storage.origins.length} origins`);

  await browser.close();

  // Копируем на сервер
  console.log('📤 Копирую на сервер...');
  execSync(`ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SERVER} "mkdir -p /opt/browser-agent/sessions"`);
  execSync(`scp -i ${SSH_KEY} -o StrictHostKeyChecking=no ${SESSION_FILE} ${SERVER}:${REMOTE}`);
  console.log('✅ Сессия скопирована на сервер!');
  console.log('🚀 Теперь запускаю скрипт каруселей на сервере...');

} catch (e) {
  console.error('❌ Ошибка:', e.message);
  process.exit(1);
}
