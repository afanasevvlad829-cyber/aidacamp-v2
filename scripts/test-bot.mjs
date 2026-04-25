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
  'unity',      // запрещённый курс
  'юнити',
  'cybersecurity', // запрещённый курс
  'кибербезопас',
];

// ─── Проверки структуры и длины ─────────────────────────────────────────────
const RESPONSE_QUALITY = {
  minLength: 50,      // минимум 50 символов в ответе
  maxLength: 3000,    // максимум 3000 символов (не бесконечно долгий)
};

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
      { q: 'Какой курс подойдёт для 8 лет?', checks: ['scratch', 'minecraft', 'курс'] },
      { q: 'Когда смены и сколько дней?', checks: ['июн', 'май', 'август', 'дней'] },
      { q: 'Можно ли звонить домой?', checks: ['телефон', 'звонк', 'каждый'] },
      { q: 'Что входит в стоимость?', checks: ['питани', 'проживани', 'трансфер'] },
      { q: 'Как добраться до лагеря?', checks: ['трансфер', 'москв', 'км'] },
    ]
  },

  'мама-подростка': {
    description: 'Мама 14-летнего, интересует IT-направление',
    questions: [
      { q: 'Дочке 14, занимается Python в школе. Будет ли ей интересно?', checks: ['python', 'ai', 'проект', 'уровень'] },
      { q: 'Что за хакатон в конце?', checks: ['хакатон', 'проект', 'день', 'команд'] },
      { q: 'Можно ли вернуть деньги если не понравится?', checks: ['%', 'дней', 'возврат'] },
      { q: 'Какой язык программирования лучше для 15 лет?', checks: ['python', 'javascript', 'java'] },
      { q: 'Есть ли группы по уровню опыта?', checks: ['уровень', 'опыт', 'группа'] },
      { q: 'Какая смена самая популярная?', checks: ['популяр', 'смена', 'июн'] },
      { q: 'Есть ли связь с интернетом?', checks: ['wifi', 'интернет', 'вай-фай'] },
      { q: 'Рассказы о реальных проектах?', notContains: ['обрёл уверенность', 'переломным'] },
    ]
  },

  'экономная-мама': {
    description: 'Цена — главный вопрос',
    questions: [
      { q: 'Сколько стоит?', checks: ['₽', 'смен', 'цен'] },
      { q: 'Есть ли скидки или кешбэк?', checks: ['скидк', 'госуслуг', 'вычет'] },
      { q: 'Как получить налоговый вычет за лагерь?', checks: ['13%', 'ФНС', 'договор'] },
      { q: 'Сколько на самую короткую смену?', checks: ['дней', 'руб', '₽'] },
      { q: 'Если привести друга, будет скидка?', checks: ['друг', 'скидк', '%'] },
      { q: 'Что входит в цену?', checks: ['питани', 'проживани', 'занят'] },
      { q: 'Есть ли рассрочка?', checks: ['банк', 'оплат', 'перевод'] },
      { q: 'Как платить за путёвку?', checks: ['договор', 'оплат', 'реквизит'] },
    ]
  },

  'тревожная-мама': {
    description: 'Беспокоится о безопасности и здоровье',
    questions: [
      { q: 'Первый раз без родителей. Как там с безопасностью?', checks: ['охран', 'огорожен', 'територі', 'вожат'] },
      { q: 'А если заболеет?', checks: ['медсестр', 'врач', 'больниц'] },
      { q: 'Как часто можно звонить?', checks: ['телефон', 'звонк', 'связ'] },
      { q: 'Где лагерь находится? Далеко ли?', checks: ['москв', 'км', 'час', 'наро'] },
      { q: 'Сколько человек в комнате?', checks: ['комната', 'человека', 'человек'] },
      { q: 'Как с едой? Есть ли аллергии?', checks: ['питани', 'аллергия', 'раз в день'] },
      { q: 'Есть ли бассейн?', checks: ['бассейн', 'вода', 'день'] },
      { q: 'Что с вожатыми? Много ли на одного ребёнка?', checks: ['вожат', 'один', 'восьм', 'деслт'] },
    ]
  },

  'деловая-мама': {
    description: 'Хочет конкретику, без воды',
    questions: [
      { q: 'Коротко: что входит в цену?', checks: ['питани', 'проживани', 'занят'] },
      { q: 'Как добраться из Москвы?', checks: ['трансфер', 'км', 'час', 'москв'] },
      { q: 'Какие документы нужны для оформления?', checks: ['договор', 'справк', 'свидетельств'] },
      { q: 'Когда смены в 2026?', checks: ['май', 'июн', 'июл', 'август'] },
      { q: 'Сколько смен всего?', checks: ['смен'] },
      { q: 'Какой у вас опыт работы с детьми?', checks: ['лет', 'детей', 'работ'] },
      { q: 'Есть ли лицензия и страховка?', checks: ['лицензи', 'страховк', 'минобр'] },
      { q: 'Как связаться с руководством?', checks: ['телефон', 'контакт', 'email'] },
    ]
  },

  'история': {
    description: 'Просит рассказать истории',
    questions: [
      { q: 'Расскажи историю из лагеря', notContains: ['обрёл уверенность', 'вернулся другим', 'переломным'] },
      { q: 'Расскажи весёлую историю про детей', notContains: ['раскрылся', 'стало переломным', 'изменился'] },
      { q: 'Есть ли истории успеха?', checks: ['проект', 'сделал', 'показал'] },
      { q: 'Что интересного происходит в лагере?', checks: ['лагер', 'занят', 'дети'] },
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

    // Проверяем длину ответа
    if (fullText.length < RESPONSE_QUALITY.minLength) {
      issues.push(yellow(`Короткий ответ: ${fullText.length} симв (мин ${RESPONSE_QUALITY.minLength})`));
    }
    if (fullText.length > RESPONSE_QUALITY.maxLength) {
      issues.push(yellow(`Слишком длинный: ${fullText.length} симв (макс ${RESPONSE_QUALITY.maxLength})`));
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
  const passRate = Math.round((total.passed / totalTests) * 100);
  const qualityRate = Math.round(((total.passed + total.warned) / totalTests) * 100);

  console.log(`\n${bold('═══════════════════════════════════════════════════════════════')}`);
  console.log(`${bold('Итого:')} ${totalTests} тестов`);
  console.log(`  ${green(`✓ Успешных: ${total.passed} (${passRate}%`)}\n    ${yellow(`△ С предупреждениями: ${total.warned} (качество ${qualityRate}%)`)}`);
  if (total.failed > 0) {
    console.log(`  ${red(`✗ Ошибок: ${total.failed}`)}`);
  }
  console.log(`${bold('═══════════════════════════════════════════════════════════════')}`);

  if (qualityRate >= 90) {
    console.log(`${green('✓ Система работает СТАБИЛЬНО (качество >= 90%)')}`);
  } else if (qualityRate >= 75) {
    console.log(`${yellow('△ Система работает, но есть проблемы (качество 75-89%)')}`);
  } else {
    console.log(`${red('✗ Система НЕ готова (качество < 75%)')}`);
  }

  if (total.failed > 0) process.exit(1);
}

main().catch(e => { console.error(red(e.message)); process.exit(1); });
