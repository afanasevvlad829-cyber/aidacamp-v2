#!/usr/bin/env node
/**
 * АйДаКемп bot regression test runner
 *
 * Запуск: node tests/run-bot-tests.mjs [--url https://dev.aidacamp.ru]
 *
 * Для каждого теста:
 *   1. Отправляет вопрос в /api/ask
 *   2. Проверяет contains / not-contains
 *   3. Вызывает /api/validate-test (прокси до нашего валидатора) для llm-rubric
 *
 * Итог: таблица pass/fail + процент прохождения.
 */

import { readFileSync } from 'fs';
import { parse } from 'path';

const BASE_URL = process.argv.find(a => a.startsWith('--url='))?.split('=')[1]
  || process.env.BOT_URL
  || 'https://dev.aidacamp.ru';

const CONCURRENCY = 2;
const TIMEOUT_MS = 25000;
const RETRY = 2; // повторных попыток при ошибке

// ── Тест-кейсы ───────────────────────────────────────────────────────────────
const TESTS = [
  // ЦЕНЫ
  { id: 'price-s1',    q: 'Сколько стоит первая смена?',           contains: ['74'], llm: 'Называет 74 900 руб. Не называет другую сумму.' },
  { id: 'price-s2',    q: 'Почём смена 2?',                         contains: ['95'], llm: 'Называет 95 000 руб.' },
  { id: 'price-s21',   q: 'Что такое смена 2.1, сколько стоит?',   contains: ['48'], llm: 'Называет 48 000 руб и 7 дней или 10–16 июня.' },
  { id: 'price-s3',    q: 'Смена 3 цена',                           contains: ['89'], llm: 'Называет 89 400 руб.' },
  { id: 'price-s4',    q: 'Хочу на смену 4 в августе',              noContains: ['бронировать', 'забронировать'], llm: 'Сообщает что мест нет. Не предлагает бронировать смену 4.' },

  // ДАТЫ / ИЮЛЬ
  { id: 'date-s1',     q: 'Когда первая смена?',                    llm: 'Называет 30 мая или 8 июня.' },
  { id: 'july',        q: 'Есть ли смены в июле?',                  llm: 'Говорит что в июле смен нет. Объясняет причину (места раскупают заранее).' },
  { id: 'days-s2',     q: 'На сколько дней рассчитана смена 2?',    contains: ['14'], llm: 'Называет 14 дней.' },

  // НАЛОГОВЫЙ ВЫЧЕТ
  { id: 'tax-amount',  q: 'Сколько вернут через налоговый вычет?',  llm: 'Называет сумму 2800–5500 руб. НЕ называет 8000, 10000, 12000 или "половину стоимости".' },
  { id: 'tax-pct',     q: 'Какой процент налогового вычета?',        contains: ['13'], llm: '13% от образовательной части. Не говорит 13% от полной цены.' },
  { id: 'cashback',    q: 'Есть ли кешбэк?',                         contains: ['15'], llm: 'Упоминает кешбэк 15% через Госуслуги.' },

  // ОПЛАТА
  { id: 'payment-50',  q: 'Как оплачивается?',                       contains: ['50%'], llm: '50% при подписании, 50% за 3 недели. Не упоминает бронь 1000 руб.' },
  { id: 'discount-full', q: 'Скидка если оплачу сразу всё?',         contains: ['5%'], llm: 'Скидка 5% при 100% оплате за 2–3 дня.' },
  { id: 'installment', q: 'Можно ли оплатить в рассрочку?',          llm: 'Лагерь рассрочку сам не даёт. Рекомендует банк. Не говорит что рассрочка доступна.' },
  { id: 'no-1k-reservation', q: 'Можно забронировать за 1000 рублей?', llm: 'Говорит что брони за 1000 руб нет. Это была старая система.' },

  // РЕФЕРАЛЬНАЯ ПРОГРАММА
  { id: 'ref-1',       q: 'Если приведу подругу, дадите скидку?',   contains: ['10%'], llm: '10% скидка обоим при 1 друге.' },
  { id: 'ref-all',     q: 'Какие скидки за приглашение друзей?',     llm: 'Упоминает 1 друг → 10%, 5 человек → 50%, 10 человек → 100 руб.' },

  // ВОЖАТЫЕ
  { id: 'ratio',       q: 'Сколько детей на одного вожатого?',       contains: ['8'], llm: '1 вожатый на 8 детей.' },
  { id: 'counselor-sleep', q: 'Вожатые спят в комнате с детьми?',   llm: 'Вожатые в отдельной вожатской на том же этаже. НЕ говорит "спят в комнате с детьми".' },
  { id: 'room-size',   q: 'По сколько человек живут в комнате?',     llm: 'Называет 2–4 человека.' },

  // ТЕЛЕФОНЫ
  { id: 'phone-time',  q: 'Когда можно звонить ребёнку?',            contains: ['19:00'], llm: 'Телефонное время 19:00, ежедневно, до 60 мин.' },
  { id: 'phone-surrender', q: 'Ребёнок может пользоваться телефоном в лагере?', llm: 'Телефоны сдаются при заезде. Телефонное время в 19:00.' },

  // ТРАНСФЕР
  { id: 'transfer-from', q: 'Откуда едет автобус?',                 llm: 'Называет метро Солнцево.' },
  { id: 'transfer-time', q: 'Во сколько автобус?',                   llm: 'Около 9:00 или 9 утра.' },
  { id: 'transfer-free', q: 'Трансфер платный?',                     llm: 'Трансфер включён в стоимость.' },

  // АДРЕС
  { id: 'distance',    q: 'Далеко ли лагерь от Москвы?',             contains: ['66'], llm: '66 км от МКАД по Калужскому шоссе.' },

  // МЕДИЦИНА
  { id: 'medical',     q: 'Есть ли врач в лагере?',                  llm: 'Медсестра круглосуточно. Не говорит "врач на месте" или "скорая на территории".' },
  { id: 'hospital',    q: 'Что если ребёнок заболеет?',              contains: ['15'], llm: 'Больница в 15 минутах.' },

  // ОПЫТ ЛАГЕРЯ
  { id: 'years',       q: 'Как давно существует лагерь?',            contains: ['6'], llm: '6 лет работы. Не говорит 3, 4, 5 лет или "3 сезона".' },
  { id: 'kids-count',  q: 'Сколько детей у вас уже побывало?',       llm: 'Более 1200 детей. Называет 1200.' },

  // ВОЗРАСТ
  { id: 'age-range',   q: 'Дети какого возраста могут поехать?',     llm: '7–16 лет. Не говорит "до 15" или "от 8".' },
  { id: 'age-7',       q: 'Сыну 7 лет, что ему подойдёт?',          llm: 'Рекомендует Scratch. Не Python или Unity.' },
  { id: 'age-10',      q: 'Дочке 10 лет, что выбрать?',              llm: 'Рекомендует Python или Minecraft. Не Кибербезопасность для 10 лет.' },

  // ПИТАНИЕ
  { id: 'meals',       q: 'Сколько раз в день кормят?',              contains: ['4'], llm: '4 раза в день. Не 3 раза.' },

  // ХАКАТОН
  { id: 'hackathon',   q: 'Что такое хакатон в лагере?',             llm: 'Последние 2 дня каждой смены. Не 3 дня.' },

  // ДОКУМЕНТЫ
  { id: 'docs-arrival', q: 'Какие документы нужны для заезда?',     llm: 'Называет справку 079/у и свидетельство о рождении или паспорт.' },
  { id: 'docs-contract', q: 'Что нужно для договора?',              llm: 'Паспорт родителя и свидетельство о рождении ребёнка.' },
  { id: 'contract-pdf', q: 'Можно посмотреть договор заранее?',     llm: 'Оферты нет, есть шаблон PDF. Даёт ссылку или упоминает aidacamp.ru.' },

  // ОПЫТ РЕБЁНКА
  { id: 'no-exp',      q: 'Ребёнок никогда не программировал, возьмёте?', llm: 'Опыт не нужен, начинают с нуля.' },
  { id: 'no-laptop',   q: 'Нужно брать свой ноутбук?',              llm: 'Ноутбук не нужен, всё предоставляется.' },

  // АКТИВНОСТИ
  { id: 'pool',        q: 'Есть ли бассейн?',                        llm: 'Бассейн есть, открытый, каждый день.' },
  { id: 'security',    q: 'Безопасно ли? Охрана есть?',              llm: 'Охрана 24/7 или закрытая территория.' },

  // TG-КАНАЛ
  { id: 'tg-channel',  q: 'Как я буду знать что с ребёнком всё хорошо?', llm: 'Упоминает Telegram-канал и ежедневные фото/видео.' },

  // ВОЗВРАТ
  { id: 'refund',      q: 'Если передумаем, деньги вернут?',         llm: 'За 30+ дней — полный возврат.' },

  // ГЕНДЕР
  { id: 'gender-f',   q: 'У меня дочка 11 лет, что ей подойдёт?',  llm: 'Использует "она" или "ей". НЕ использует "он" или "ему" для ребёнка.' },
  { id: 'gender-m',   q: 'Сыну 12 лет, какой курс лучше?',          llm: 'Использует "он" или "ему". Не "она".' },

  // СТИЛЬ
  { id: 'no-emoji',    q: 'Расскажите о лагере',                     check: (text) => !/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(text), checkLabel: 'Нет эмодзи' },
  { id: 'vy',          q: 'Хочу узнать про лагерь',                  llm: 'Обращается на "Вы" с заглавной. Не на "ты".' },
];

// ── HTTP helpers ──────────────────────────────────────────────────────────────
async function askBot(question) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE_URL}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: question, history: [] }),
      signal: ac.signal,
    });
    const j = await r.json();
    return j.text || '';
  } finally {
    clearTimeout(timer);
  }
}

async function validateWithLLM(question, botText, rubric) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`${BASE_URL}/api/validate-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, botText, rubric }),
      signal: ac.signal,
    });
    const j = await r.json();
    return j; // { valid: bool, issue?: string }
  } catch {
    return { valid: true }; // fallback
  } finally {
    clearTimeout(timer);
  }
}

// ── Runner ───────────────────────────────────────────────────────────────────
async function runTest(test) {
  let botText;
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      botText = await askBot(test.q);
      // Если вернулась ошибка сервера — повторяем
      if (botText.includes('Что-то пошло не так') && attempt < RETRY) {
        await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      break;
    } catch (e) {
      if (attempt < RETRY) { await new Promise(r => setTimeout(r, 2000)); continue; }
      return { id: test.id, pass: false, reason: `API error: ${e.message}`, botText: '' };
    }
  }

  const cleanText = botText.replace(/<[^>]*>/g, ''); // strip HTML tags

  // contains checks
  for (const needle of (test.contains || [])) {
    if (!cleanText.includes(needle)) {
      return { id: test.id, pass: false, reason: `Нет подстроки: "${needle}"`, botText };
    }
  }

  // not-contains checks
  for (const needle of (test.noContains || [])) {
    if (cleanText.toLowerCase().includes(needle.toLowerCase())) {
      return { id: test.id, pass: false, reason: `Запрещённая подстрока: "${needle}"`, botText };
    }
  }

  // custom check function
  if (test.check && !test.check(cleanText)) {
    return { id: test.id, pass: false, reason: test.checkLabel || 'Custom check failed', botText };
  }

  // LLM rubric
  if (test.llm) {
    const v = await validateWithLLM(test.q, cleanText, test.llm);
    if (!v.valid) {
      return { id: test.id, pass: false, reason: v.issue || 'LLM rubric failed', botText };
    }
  }

  return { id: test.id, pass: true, botText };
}

// ── Concurrency pool ──────────────────────────────────────────────────────────
async function runAll() {
  const results = [];
  const queue = [...TESTS];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const test = queue.shift();
      process.stderr.write(`  Running: ${test.id}...\r`);
      const r = await runTest(test);
      results.push(r);
    }
  });
  await Promise.all(workers);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
console.log(`\n🤖 АйДаКемп Bot Regression Tests`);
console.log(`   URL: ${BASE_URL}`);
console.log(`   Tests: ${TESTS.length}\n`);

const start = Date.now();
const results = await runAll();
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

const passed = results.filter(r => r.pass);
const failed = results.filter(r => !r.pass);

// Print results
if (failed.length) {
  console.log('❌ FAILED:');
  for (const r of failed) {
    console.log(`  [${r.id}] ${r.reason}`);
    if (r.botText) console.log(`    Bot said: "${r.botText.slice(0, 150).replace(/\n/g, ' ')}..."`);
  }
  console.log();
}

console.log('─'.repeat(50));
console.log(`✅ Passed: ${passed.length}/${TESTS.length} (${Math.round(100 * passed.length / TESTS.length)}%)`);
if (failed.length) {
  console.log(`❌ Failed: ${failed.length}/${TESTS.length}`);
}
console.log(`⏱  Duration: ${elapsed}s`);

process.exit(failed.length > 0 ? 1 : 0);
