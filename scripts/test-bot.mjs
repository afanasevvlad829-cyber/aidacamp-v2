#!/usr/bin/env node
/**
 * test-bot.mjs — автотест чат-бота /api/ask
 *
 * Тестирует разные профили пользователей и проверяет качество ответов.
 *
 * Использование:
 *   node scripts/test-bot.mjs               — тест на dev.aidacamp.ru
 *   node scripts/test-bot.mjs --prod        — тест на aidacamp.ru
 *   node scripts/test-bot.mjs --profile мама-первоклассника
 *   node scripts/test-bot.mjs --verbose     — показывать полные ответы
 *   node scripts/test-bot.mjs --profile все --verbose
 */

const args = process.argv.slice(2);
const isProd    = args.includes('--prod');
const isVerbose = args.includes('--verbose');
const profileArg = args[args.indexOf('--profile') + 1] || 'все';

const BASE_URL = isProd ? 'https://aidacamp.ru' : 'https://dev.aidacamp.ru';

// ─── Антипаттерны — слова/фразы которых НЕ должно быть в ответах ───────────
const FORBIDDEN = [
  'ребёнок',    // запрещено в любом падеже — см. systemPrompt
  'ребёнка',
  'ребёнку',
  'ребёнком',
  'обрёл уверенность',
  'вернулся другим',
  'переломным моментом',
  'раскрылся',
  'soft-skill',
  'компетенци',
  'фундамент знаний',
  'Отличный выбор',
  'Замечательно',
];

// ─── Ключевые слова — должны присутствовать в ответах по теме ───────────────
const REQUIRED_KEYWORDS = {
  'цены': ['₽', 'цен', 'стоимост'],
  'смены': ['смен', 'июн', 'июл', 'август', 'май'],
  'возврат': ['%', 'возврат', 'дней'],
  'налоговый вычет': ['13%', 'ФНС', 'вычет'],
  'питание': ['питани', 'завтрак', 'обед', 'ужин'],
  'телефон': ['телефон', 'связ', 'звонк'],
};

// ─── Профили пользователей ───────────────────────────────────────────────────
const PROFILES = {

  'мама-первоклассника': {
    description: 'Мама 7-летнего, ищет с чего начать',
    questions: [
      { q: 'Сыну 7 лет, он никогда не программировал. Подойдёт?', checks: ['возраст', 'scratch', 'minecraft', '7'] },
      { q: 'Что они там делают весь день?', checks: ['расписани', 'занят', 'бассейн', 'вечер'] },
      { q: 'Ноутбук нужен?', checks: ['нет', 'нашим', 'своим', 'не нужен'] },
    ]
  },

  'мама-подростка': {
    description: 'Мама 14-летнего, интересует IT-направление',
    questions: [
      { q: 'Дочке 14, занимается Python в школе. Будет ли ей интересно?', checks: ['python', 'ai', 'проект', 'уровень'] },
      { q: 'Что за хакатон в конце?', checks: ['хакатон', 'проект', 'день', 'команд'] },
      { q: 'Можно ли вернуть деньги если не понравится?', checks: ['%', 'дней', 'возврат'] },
    ]
  },

  'экономная-мама': {
    description: 'Цена — главный вопрос',
    questions: [
      { q: 'Сколько стоит?', checks: ['₽', 'смен', 'цен'] },
      { q: 'Есть ли скидки или кешбэк?', checks: ['кешбэк', 'скидк', 'госуслуг', 'вычет'] },
      { q: 'Как получить налоговый вычет за лагерь?', checks: ['13%', 'ФНС', 'договор'] },
    ]
  },

  'тревожная-мама': {
    description: 'Беспокоится о безопасности и здоровье',
    questions: [
      { q: 'Первый раз без родителей. Как там с безопасностью?', checks: ['охран', 'огорожен', 'территори', 'вожат'] },
      { q: 'А если заболеет?', checks: ['медсестр', 'врач', 'больниц'] },
      { q: 'Как часто можно звонить?', checks: ['телефон', 'звонк', 'связ'] },
    ]
  },

  'деловая-мама': {
    description: 'Хочет конкретику, без воды',
    questions: [
      { q: 'Коротко: что входит в цену?', checks: ['питани', 'проживани', 'занят'] },
      { q: 'Как добраться из Москвы?', checks: ['трансфер', 'км', 'час', 'москв'] },
      { q: 'Какие документы нужны для оформления?', checks: ['договор', 'справк', 'свидетельств'] },
    ]
  },

  'история': {
    description: 'Просит рассказать истории',
    questions: [
      { q: 'Расскажи историю из лагеря', notContains: ['обрёл уверенность', 'вернулся другим', 'переломным'] },
      { q: 'Расскажи весёлую историю', notContains: ['раскрылся', 'стало переломным', 'изменился'] },
      { q: 'Расскажи грустную историю', notContains: ['трансформац', 'обрёл', 'уверенност'] },
    ]
  },

};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkForbidden(text) {
  const found = [];
  for (const f of FORBIDDEN) {
    if (text.toLowerCase().includes(f.toLowerCase())) found.push(f);
  }
  return found;
}

function checkContains(text, keywords) {
  return keywords.filter(k => text.toLowerCase().includes(k.toLowerCase()));
}

function checkMissing(text, keywords) {
  return keywords.filter(k => !text.toLowerCase().includes(k.toLowerCase()));
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function colorize(str, code) {
  return `\x1b[${code}m${str}\x1b[0m`;
}
const green  = s => colorize(s, 32);
const red    = s => colorize(s, 31);
const yellow = s => colorize(s, 33);
const gray   = s => colorize(s, 90);
const bold   = s => colorize(s, 1);
const cyan   = s => colorize(s, 36);

async function ask(question, history = []) {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question, history }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runProfile(name, profile) {
  console.log(`\n${bold(cyan(`▶ Профиль: ${name}`))} — ${gray(profile.description)}`);
  console.log(gray('─'.repeat(60)));

  let passed = 0, failed = 0, warned = 0;

  for (const test of profile.questions) {
    process.stdout.write(`  ${gray('?')} ${test.q}\n`);

    let data;
    try {
      data = await ask(test.q);
    } catch (e) {
      console.log(`    ${red('✗ ОШИБКА запроса:')} ${e.message}`);
      failed++;
      continue;
    }

    const fullText = stripHtml(data.text || '');
    const issues = [];

    // Проверяем запрещённые слова
    const forbidden = checkForbidden(fullText);
    if (forbidden.length) {
      issues.push(red(`Запрещено: "${forbidden.join('", "')}"`));
    }

    // Проверяем notContains (для историй)
    if (test.notContains) {
      const bad = test.notContains.filter(w => fullText.toLowerCase().includes(w.toLowerCase()));
      if (bad.length) issues.push(red(`Пафос: "${bad.join('", "')}"`));
    }

    // Проверяем обязательные ключевые слова
    if (test.checks) {
      const missing = checkMissing(fullText, test.checks);
      if (missing.length > test.checks.length / 2) {
        // Больше половины ключевых слов отсутствует — проблема
        issues.push(yellow(`Не упомянуто: "${missing.join('", "')}"`));
      }
    }

    // Проверяем JSON-структуру
    if (!data.state || data.state !== 'ok') {
      issues.push(red(`state != ok: ${data.state}`));
    }

    if (issues.length === 0) {
      console.log(`    ${green('✓')} OK ${gray(`(${fullText.length} симв, block: ${data.block_type || 'null'})`)}`);
      if (isVerbose) {
        console.log(gray(`    └─ ${fullText.slice(0, 180)}${fullText.length > 180 ? '...' : ''}`));
      }
      passed++;
    } else {
      const hasErrors = issues.some(i => i.includes('\x1b[31m')); // red
      if (hasErrors) {
        console.log(`    ${red('✗')} ${issues.join(' | ')}`);
        failed++;
      } else {
        console.log(`    ${yellow('△')} ${issues.join(' | ')}`);
        warned++;
      }
      if (isVerbose) {
        console.log(gray(`    └─ ${fullText.slice(0, 180)}${fullText.length > 180 ? '...' : ''}`));
      }
    }

    // Небольшая пауза чтобы не перегружать
    await new Promise(r => setTimeout(r, 800));
  }

  return { passed, failed, warned };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold(`\n🤖 Тест бота АйДаКемп — ${BASE_URL}/api/ask`));
  console.log(gray(`Профиль: ${profileArg} | Verbose: ${isVerbose}`));

  const profilesToRun = profileArg === 'все'
    ? Object.entries(PROFILES)
    : Object.entries(PROFILES).filter(([name]) => name === profileArg);

  if (!profilesToRun.length) {
    console.error(red(`Профиль "${profileArg}" не найден. Доступны: ${Object.keys(PROFILES).join(', ')}, все`));
    process.exit(1);
  }

  let total = { passed: 0, failed: 0, warned: 0 };

  for (const [name, profile] of profilesToRun) {
    const result = await runProfile(name, profile);
    total.passed += result.passed;
    total.failed += result.failed;
    total.warned += result.warned;
  }

  const totalTests = total.passed + total.failed + total.warned;
  console.log(`\n${bold('Итого:')} ${totalTests} тестов — ${green(`${total.passed} ✓`)} ${total.warned ? yellow(`${total.warned} △`) : ''} ${total.failed ? red(`${total.failed} ✗`) : ''}`);

  if (total.failed > 0) process.exit(1);
}

main().catch(e => { console.error(red(e.message)); process.exit(1); });
