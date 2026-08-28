#!/usr/bin/env node
// Headless-версия ask-test.astro: гоняет golden-кейсы против /api/ask и грейдит ответы.
// Использование: BASE_URL=https://dev.aidacamp.ru node scripts/eval-ask-bot.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runGraders } from './eval-graders.mjs';

const BASE_URL = process.env.BASE_URL || 'https://dev.aidacamp.ru';
const { cases } = JSON.parse(readFileSync(new URL('./eval-cases/golden.json', import.meta.url)));

async function askBot(message) {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history: [] }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const results = [];
  let failed = 0;
  for (const c of cases) {
    process.stdout.write(`▸ ${c.id}: "${c.question}" ... `);
    let resp, error = null;
    try {
      resp = await askBot(c.question);
    } catch (e) {
      error = e.message;
    }
    const graded = resp ? runGraders(c, resp) : { passed: false, failures: [`запрос упал: ${error}`] };
    if (!graded.passed) failed++;
    console.log(graded.passed ? 'OK' : `FAIL (${graded.failures.join('; ')})`);
    results.push({ case_id: c.id, question: c.question, response: resp ?? null, ...graded });
  }

  mkdirSync(new URL('./eval-reports/', import.meta.url), { recursive: true });
  const reportPath = new URL(`./eval-reports/${Date.now()}.json`, import.meta.url);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n${cases.length - failed}/${cases.length} passed. Отчёт: ${reportPath.pathname}`);
  if (failed > 0) process.exit(1);
}

main();
