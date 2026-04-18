import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SESSION_FILE = join(__dirname, '../.direct-session.json');
const SERVER = 'root@159.194.223.55';
const SSH_KEY = `${process.env.HOME}/.ssh/aidacamp_prod`;
const REMOTE_SESSION = '/opt/browser-agent/sessions/direct.json';

function waitForEnter() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question('', () => { rl.close(); resolve(); }));
}

console.log('🚀 Открываю браузер...');

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
const page = await ctx.newPage();

await page.goto('https://passport.yandex.ru/auth?retpath=https%3A%2F%2Fdirect.yandex.ru%2F');

console.log('');
console.log('⏳ Залогинься в браузере под аккаунтом kv145');
console.log('⏳ После того как откроется Директ — нажми Enter здесь');
console.log('');

await waitForEnter();

const url = page.url();
console.log(`URL после логина: ${url}`);

if (url.includes('passport') || url.includes('login')) {
  console.error('❌ Похоже не залогинился. Попробуй ещё раз.');
  await browser.close();
  process.exit(1);
}

const storage = await ctx.storageState();
writeFileSync(SESSION_FILE, JSON.stringify(storage, null, 2));
console.log(`\n✅ Сессия сохранена: ${SESSION_FILE}`);
await browser.close();

console.log('📤 Копирую на сервер...');
try {
  execSync(`ssh -i ${SSH_KEY} ${SERVER} "mkdir -p /opt/browser-agent/sessions"`);
  execSync(`scp -i ${SSH_KEY} ${SESSION_FILE} ${SERVER}:${REMOTE_SESSION}`);
  console.log('✅ Готово! Запускаю скрипт карусели на сервере...');
} catch (e) {
  console.error('❌ Ошибка scp:', e.message);
  console.log(`Скопируй вручную:\n  scp ${SESSION_FILE} ${SERVER}:${REMOTE_SESSION}`);
}
