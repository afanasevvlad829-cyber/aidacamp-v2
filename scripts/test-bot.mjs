#!/usr/bin/env node
/**
 * test-bot.mjs — автотест чат-бота /api/ask
 *
 * Тестирует разные профили пользователей и проверяет качество ответов.
 *
 * Использование:
 *   node scripts/test-bot.mjs                        — тест на dev.aidacamp.ru
 *   node scripts/test-bot.mjs --prod                 — тест на aidacamp.ru
 *   node scripts/test-bot.mjs --profile мама-первоклассника
 *   node scripts/test-bot.mjs --verbose              — показывать полные ответы
 *   node scripts/test-bot.mjs --report               — HTML-отчёт → /tmp/bot-report.html
 *   node scripts/test-bot.mjs --report ./report.html — HTML-отчёт в указанный файл
 *   node scripts/test-bot.mjs --profile все --verbose
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const isProd    = args.includes('--prod');
const isVerbose = args.includes('--verbose');
const profileArg = args[args.indexOf('--profile') + 1] || 'все';
const reportFlagIdx = args.indexOf('--report');
const isReport  = reportFlagIdx !== -1;
const reportPath = isReport && args[reportFlagIdx + 1] && !args[reportFlagIdx + 1].startsWith('--')
  ? resolve(args[reportFlagIdx + 1])
  : '/tmp/bot-report.html';

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

function evaluateResult(test, data) {
  const fullText = stripHtml(data.text || '');
  const issues = [];
  let issueTypes = [];

  const forbidden = checkForbidden(fullText);
  if (forbidden.length) {
    issues.push(`Запрещено: "${forbidden.join('", "')}"`);
    issueTypes.push('forbidden');
  }
  if (test.notContains) {
    const bad = test.notContains.filter(w => fullText.toLowerCase().includes(w.toLowerCase()));
    if (bad.length) { issues.push(`Пафос: "${bad.join('", "')}"`); issueTypes.push('pafos'); }
  }
  if (test.checks) {
    const missing = checkMissing(fullText, test.checks);
    if (missing.length > test.checks.length / 2) {
      issues.push(`Не упомянуто: "${missing.join('", "')}"`);
      issueTypes.push('missing');
    }
  }
  if (!data.state || data.state !== 'ok') {
    issues.push(`state != ok: ${data.state}`); issueTypes.push('state');
  }
  if (fullText.length < RESPONSE_QUALITY.minLength) {
    issues.push(`Короткий ответ: ${fullText.length} симв`); issueTypes.push('short');
  }
  if (fullText.length > RESPONSE_QUALITY.maxLength) {
    issues.push(`Слишком длинный: ${fullText.length} симв`); issueTypes.push('long');
  }

  const hasErrors = issueTypes.some(t => ['forbidden','pafos','state'].includes(t));
  const status = issues.length === 0 ? 'pass' : hasErrors ? 'fail' : 'warn';
  return { status, issues, fullText, blockType: data.block_type || null, charCount: fullText.length };
}

async function runProfile(name, profile) {
  console.log(`\n${bold(cyan(`▶ Профиль: ${name}`))} — ${gray(profile.description)}`);
  console.log(gray('─'.repeat(60)));

  let passed = 0, failed = 0, warned = 0;
  const results = [];

  for (const test of profile.questions) {
    process.stdout.write(`  ${gray('?')} ${test.q}\n`);

    let data;
    try {
      data = await ask(test.q);
    } catch (e) {
      console.log(`    ${red('✗ ОШИБКА запроса:')} ${e.message}`);
      failed++;
      results.push({ q: test.q, status: 'fail', issues: [e.message], fullText: '', blockType: null, charCount: 0 });
      continue;
    }

    const ev = evaluateResult(test, data);
    results.push({ q: test.q, ...ev });

    if (ev.status === 'pass') {
      console.log(`    ${green('✓')} OK ${gray(`(${ev.charCount} симв, block: ${ev.blockType || 'null'})`)}`);
      if (isVerbose) console.log(gray(`    └─ ${ev.fullText.slice(0, 180)}${ev.fullText.length > 180 ? '...' : ''}`));
      passed++;
    } else if (ev.status === 'fail') {
      console.log(`    ${red('✗')} ${ev.issues.map(i => red(i)).join(' | ')}`);
      if (isVerbose) console.log(gray(`    └─ ${ev.fullText.slice(0, 180)}${ev.fullText.length > 180 ? '...' : ''}`));
      failed++;
    } else {
      console.log(`    ${yellow('△')} ${ev.issues.map(i => yellow(i)).join(' | ')}`);
      if (isVerbose) console.log(gray(`    └─ ${ev.fullText.slice(0, 180)}${ev.fullText.length > 180 ? '...' : ''}`));
      warned++;
    }

    await new Promise(r => setTimeout(r, 800));
  }

  return { passed, failed, warned, results };
}

// ─── HTML Report Generator ────────────────────────────────────────────────────

function generateHtml(profileResults, total, runDate, url) {
  const totalTests = total.passed + total.failed + total.warned;
  const passRate = Math.round((total.passed / totalTests) * 100);
  const qualityRate = Math.round(((total.passed + total.warned) / totalTests) * 100);
  const verdict = qualityRate >= 90 ? { text: 'Стабильно', color: '#16a34a', bg: '#f0fdf4' }
    : qualityRate >= 75 ? { text: 'Есть замечания', color: '#d97706', bg: '#fffbeb' }
    : { text: 'Не готово', color: '#dc2626', bg: '#fef2f2' };

  const statusIcon = s => s === 'pass' ? '✓' : s === 'warn' ? '△' : '✗';
  const statusColor = s => s === 'pass' ? '#16a34a' : s === 'warn' ? '#d97706' : '#dc2626';
  const statusBg = s => s === 'pass' ? '#f0fdf4' : s === 'warn' ? '#fffbeb' : '#fef2f2';

  const profileSections = profileResults.map(({ name, profile, results, passed, failed, warned }) => {
    const pTotal = passed + failed + warned;
    const pQuality = Math.round(((passed + warned) / pTotal) * 100);
    const rows = results.map(r => `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 12px;font-size:14px;color:#0f172a;max-width:320px">${r.q}</td>
        <td style="padding:10px 12px;text-align:center">
          <span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:${statusBg(r.status)};color:${statusColor(r.status)};font-weight:700;font-size:13px;line-height:24px">${statusIcon(r.status)}</span>
        </td>
        <td style="padding:10px 12px;font-size:13px;color:#475569;max-width:400px">
          ${r.issues.length ? `<span style="color:${statusColor(r.status)}">${r.issues.join('; ')}</span>` : ''}
          ${r.fullText ? `<div style="margin-top:${r.issues.length?6:0}px;color:#64748b;font-style:italic;font-size:12px">${r.fullText.slice(0,200)}${r.fullText.length>200?'…':''}</div>` : ''}
        </td>
        <td style="padding:10px 12px;font-size:12px;color:#94a3b8;white-space:nowrap">${r.blockType || '—'}<br>${r.charCount} симв</td>
      </tr>`).join('');
    return `
    <div style="margin-bottom:32px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.05)">
      <div style="padding:16px 20px;background:#f8fafc;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:16px;font-weight:700;color:#0f172a">${name}</div>
          <div style="font-size:13px;color:#64748b;margin-top:2px">${profile.description}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${pQuality>=90?'#16a34a':pQuality>=75?'#d97706':'#dc2626'}">${pQuality}%</div>
          <div style="font-size:11px;color:#94a3b8">${passed}✓ ${warned}△ ${failed}✗ из ${pTotal}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Вопрос</th>
            <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;width:50px">Статус</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Ответ / Замечание</th>
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;width:100px">Блок</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Отчёт тестирования бота АйДаКемп — ${runDate}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.5}
  .wrap{max-width:900px;margin:0 auto;padding:32px 16px}
  @media(max-width:600px){.stats-row{flex-direction:column!important}}
</style>
</head>
<body>
<div class="wrap">

  <!-- Шапка -->
  <div style="margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <span style="font-size:28px;font-weight:800;color:#0f172a">#АйДаКемп</span>
      <span style="font-size:14px;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;padding:3px 10px;border-radius:20px">Бот-отчёт</span>
    </div>
    <div style="font-size:13px;color:#64748b">${url} · ${runDate}</div>
  </div>

  <!-- Итоговый вердикт -->
  <div style="background:${verdict.bg};border:1.5px solid ${verdict.color}33;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:center">
    <div>
      <div style="font-size:13px;color:#64748b;margin-bottom:4px">Общий результат</div>
      <div style="font-size:26px;font-weight:800;color:${verdict.color}">${verdict.text}</div>
      <div style="font-size:13px;color:#64748b;margin-top:4px">Качество: ${qualityRate}% · Прошли: ${passRate}%</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:36px;font-weight:900;color:${verdict.color}">${qualityRate}%</div>
      <div style="font-size:12px;color:#94a3b8">${totalTests} тестов</div>
    </div>
  </div>

  <!-- Статистика -->
  <div class="stats-row" style="display:flex;gap:12px;margin-bottom:28px">
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#16a34a">${total.passed}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Успешных</div>
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#d97706">${total.warned}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Предупреждений</div>
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#dc2626">${total.failed}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Ошибок</div>
    </div>
    <div style="flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center">
      <div style="font-size:28px;font-weight:800;color:#0f172a">${totalTests}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px">Всего тестов</div>
    </div>
  </div>

  <!-- По профилям -->
  <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:16px">Результаты по аватарам</div>
  ${profileSections}

  <!-- Легенда -->
  <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-top:8px">
    <div style="font-size:13px;font-weight:600;color:#64748b;margin-bottom:10px">Легенда</div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;font-size:13px">
      <span><span style="color:#16a34a;font-weight:700">✓ Успешно</span> — ответ корректный, нет запрещённых слов, содержит нужные факты</span>
      <span><span style="color:#d97706;font-weight:700">△ Предупреждение</span> — ответ приемлем, но не все ключевые слова упомянуты</span>
      <span><span style="color:#dc2626;font-weight:700">✗ Ошибка</span> — запрещённые слова, пафос или неверный формат ответа</span>
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:12px;color:#94a3b8">
    Сгенерировано автоматически · scripts/test-bot.mjs · АйДаКемп ${new Date().getFullYear()}
  </div>

</div>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(bold(`\n🤖 Тест бота АйДаКемп — ${BASE_URL}/api/ask`));
  console.log(gray(`Профиль: ${profileArg} | Verbose: ${isVerbose} | Отчёт: ${isReport ? reportPath : 'нет'}`));

  const profilesToRun = profileArg === 'все'
    ? Object.entries(PROFILES)
    : Object.entries(PROFILES).filter(([name]) => name === profileArg);

  if (!profilesToRun.length) {
    console.error(red(`Профиль "${profileArg}" не найден. Доступны: ${Object.keys(PROFILES).join(', ')}, все`));
    process.exit(1);
  }

  let total = { passed: 0, failed: 0, warned: 0 };
  const profileResults = [];

  for (const [name, profile] of profilesToRun) {
    const result = await runProfile(name, profile);
    total.passed += result.passed;
    total.failed += result.failed;
    total.warned += result.warned;
    profileResults.push({ name, profile, ...result });
  }

  const totalTests = total.passed + total.failed + total.warned;
  const passRate = Math.round((total.passed / totalTests) * 100);
  const qualityRate = Math.round(((total.passed + total.warned) / totalTests) * 100);

  console.log(`\n${bold('═══════════════════════════════════════════════════════════════')}`);
  console.log(`${bold('Итого:')} ${totalTests} тестов`);
  console.log(`  ${green(`✓ Успешных: ${total.passed} (${passRate}%`)}\n    ${yellow(`△ С предупреждениями: ${total.warned} (качество ${qualityRate}%)`)}`);
  if (total.failed > 0) console.log(`  ${red(`✗ Ошибок: ${total.failed}`)}`);
  console.log(`${bold('═══════════════════════════════════════════════════════════════')}`);

  if (qualityRate >= 90) console.log(`${green('✓ Система работает СТАБИЛЬНО (качество >= 90%)')}`);
  else if (qualityRate >= 75) console.log(`${yellow('△ Система работает, но есть проблемы (качество 75-89%)')}`);
  else console.log(`${red('✗ Система НЕ готова (качество < 75%)')}`);

  if (isReport) {
    const runDate = new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const html = generateHtml(profileResults, total, runDate, BASE_URL);
    writeFileSync(reportPath, html, 'utf-8');
    console.log(`\n${bold('📄 Отчёт сохранён:')} ${reportPath}`);
  }

  if (total.failed > 0) process.exit(1);
}

main().catch(e => { console.error(red(e.message)); process.exit(1); });
