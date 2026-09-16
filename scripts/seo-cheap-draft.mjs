#!/usr/bin/env node
/**
 * Дешёвый механический SEO-черновик через Together AI. Модель
 * Qwen/Qwen2.5-7B-Instruct-Turbo найдена и протестирована 12.08.2026: она не
 * reasoning-модель (не тратит лимит на скрытые рассуждения). Reasoning-модели
 * здесь неэкономичны, а GLM-4.6 требует отдельный платный dedicated endpoint.
 *
 * Usage:
 *   TOGETHER_API_KEY=... node scripts/seo-cheap-draft.mjs --keyword "IT лагерь" --text "Летняя смена для детей."
 *   TOGETHER_API_KEY=test-key-placeholder node scripts/seo-cheap-draft.mjs --keyword "IT лагерь" --text "Летняя смена для детей." --dry-run
 */

const API_URL = 'https://api.together.xyz/v1/chat/completions';
const MODEL = 'Qwen/Qwen2.5-7B-Instruct-Turbo';

function parseArgs(argv) {
  const result = { dryRun: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dry-run') {
      result.dryRun = true;
      continue;
    }
    if (arg !== '--keyword' && arg !== '--text') {
      throw new Error(`Неизвестный аргумент: ${arg}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Для ${arg} требуется значение`);
    }
    result[arg.slice(2)] = value;
    index += 1;
  }

  if (!result.keyword?.trim()) throw new Error('Не указан непустой --keyword');
  if (!result.text?.trim()) throw new Error('Не указан непустой --text');
  return result;
}

function buildRequest(keyword, sourceText) {
  return {
    model: MODEL,
    temperature: 0.1,
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: [
          'Ты редактор SEO-текста.',
          'Органично впиши указанное ключевое слово в исходный текст, сохранив его смысл.',
          'Не добавляй новые факты, цифры или утверждения.',
          'Верни только итоговый текст: без пояснений, кавычек и Markdown-обёртки.',
        ].join(' '),
      },
      {
        role: 'user',
        content: `Ключевое слово: ${keyword}\n\nИсходный текст:\n${sourceText}`,
      },
    ],
  };
}

function sanitizeDraft(value) {
  let draft = value.trim();
  const fenced = draft.match(/^```(?:\w+)?\s*\n?([\s\S]*?)\n?```$/);
  if (fenced) draft = fenced[1].trim();

  const quotePairs = [
    ['"', '"'],
    ["'", "'"],
    ['«', '»'],
    ['“', '”'],
    ['„', '“'],
  ];
  for (const [open, close] of quotePairs) {
    if (draft.startsWith(open) && draft.endsWith(close) && draft.length >= 2) {
      draft = draft.slice(open.length, -close.length).trim();
      break;
    }
  }
  return draft;
}

function printError(message) {
  process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  process.exitCode = 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const request = buildRequest(args.keyword.trim(), args.text.trim());

  if (args.dryRun) {
    process.stdout.write(`${JSON.stringify({ ok: true, dry_run: true, request })}\n`);
    return;
  }

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) throw new Error('Не задана переменная окружения TOGETHER_API_KEY');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Together AI API вернул HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Together AI вернул пустой content');
  }

  const draft = sanitizeDraft(content);
  if (!draft) throw new Error('Ответ модели пуст после санитизации');

  process.stdout.write(`${JSON.stringify({
    ok: true,
    draft,
    model: data.model || MODEL,
    usage: {
      input_tokens: data.usage?.prompt_tokens ?? null,
      output_tokens: data.usage?.completion_tokens ?? null,
    },
  })}\n`);
}

main().catch((error) => printError(error instanceof Error ? error.message : String(error)));
