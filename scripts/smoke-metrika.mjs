#!/usr/bin/env node
// Headless-проверка Метрики на проде — запускается НА СЕРВЕРЕ через существующий
// agent-browser-chrome.service (CDP 127.0.0.1:9222). Заливается и вызывается из
// scripts/smoke-conversion.sh (scp + ssh), playwright берётся из /opt/browser-agent.
//
// Проверяет три звена клиентского конверсионного контура:
//   1) ym определён (сниппет исполнился, не задушен прокси типа Partytown);
//   2) счётчик реально отстучал визит в mc.yandex.ru (/watch/<counter>);
//   3) reachGoal доходит до Метрики (goal-хит в сети). Цель deploy_smoke в
//      Метрике не заведена — на конверсии и Директ не влияет.
//
// Exit-коды: 0 — контур работает; 1 — контур сломан (повод для отката);
// 2 — Chrome/CDP/playwright недоступны: сломан ЧЕКЕР, а не прод —
//     откатывать по этому коду нельзя, только алертить.
import { createRequire } from 'node:module';

const BROWSER_AGENT_DIR = '/opt/browser-agent';
const require = createRequire(BROWSER_AGENT_DIR + '/_resolve_base.js');

function infraFail(msg) {
  console.log(JSON.stringify({ status: 'infra', error: msg }));
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  infraFail(`playwright не найден в ${BROWSER_AGENT_DIR}: ${e.message}`);
}

const BASE = (process.argv[2] || 'https://aidacamp.ru').replace(/\/+$/, '');
const COUNTER = '96499295';
const GOAL = 'deploy_smoke';

function waitFor(fn, ms, step = 500) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const iv = setInterval(() => {
      if (fn()) { clearInterval(iv); resolve(true); }
      else if (Date.now() - t0 > ms) { clearInterval(iv); resolve(false); }
    }, step);
  });
}

let browser;
try {
  browser = await chromium.connectOverCDP('http://127.0.0.1:9222', { timeout: 10000 });
} catch (e) {
  infraFail(`CDP 127.0.0.1:9222 недоступен (agent-browser-chrome.service?): ${e.message}`);
}

const result = { status: 'fail', ym_defined: false, counter_hit: false, goal_hit: false };
let page;
try {
  const ctx = browser.contexts()[0] || (await browser.newContext());
  page = await ctx.newPage();

  // Маскировка под обычный браузер: __isBot в Base.astro смотрит на
  // navigator.webdriver и UA. Сейчас Метрика ботов не отсекает (временный
  // сниппет с 2026-07-04), но при возврате lazy-load с __isBot немаскированный
  // headless отключил бы счётчик — и smoke врал бы «контур сломан».
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.setUserAgentOverride', {
    userAgent:
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  });
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: "Object.defineProperty(navigator, 'webdriver', { get: () => false });",
  });

  const hits = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.includes('mc.yandex') && u.includes('/watch/')) hits.push(u);
  });

  await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });

  result.ym_defined = await page
    .waitForFunction(() => typeof window.ym === 'function', null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);

  result.counter_hit = await waitFor(() => hits.some((u) => u.includes(COUNTER)), 20000);

  if (result.ym_defined) {
    await page.evaluate(
      ([id, goal]) => window.ym(Number(id), 'reachGoal', goal),
      [COUNTER, GOAL],
    );
    // goal-хит: /watch/<counter> с page-url=goal://…/deploy_smoke
    result.goal_hit = await waitFor(
      () => hits.some((u) => u.includes('goal') && u.includes(GOAL)),
      15000,
    );
  }

  result.status = result.ym_defined && result.counter_hit && result.goal_hit ? 'ok' : 'fail';
} catch (e) {
  result.error = String((e && e.message) || e);
} finally {
  try { if (page) await page.close(); } catch { /* headless остаётся жить */ }
  try { await browser.close(); } catch { /* connectOverCDP: это только disconnect */ }
}

console.log(JSON.stringify(result));
process.exit(result.status === 'ok' ? 0 : 1);
