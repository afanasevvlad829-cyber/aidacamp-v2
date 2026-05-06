#!/usr/bin/env node
/**
 * Локальная генерация TTS через ElevenLabs
 * Запускать с MacBook (ElevenLabs заблокирован на RU-сервере)
 *
 * Использование:
 *   node scripts/generate-tts-local.js
 *   node scripts/generate-tts-local.js --upload   # + загрузить на сервер
 */

import { createHash } from 'node:crypto';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(__dirname, '../audio/tts-cache');
const VOICE = 'FGY2WhTYpPnrIDTdsKH5'; // rachel — ElevenLabs voice ID
const VOICE_NAME = 'rachel';
const UPLOAD = process.argv.includes('--upload');

// Все тексты нарратива из ai-studio.astro
const TEXTS = [
  'Нейросети для текста — одни. Для картинок — другие. Для видео — третьи. Для кода — четвёртые.',
  'Обычно так: дайте учащемуся кредитку, зарегистрируйтесь в восьми сервисах, разберитесь с восемью интерфейсами.',
  'Мы сделали иначе. Один адрес, один логин — и всё уже внутри.',
  'Кликайте на любой блок — расскажем подробнее.',
  'Теперь про кухню. Как это вообще работает, если не вдаваться в занудство.',
  'Учащийся открывает браузер. Логин, пароль — и наш интерфейс со всеми инструментами.',
  'Главное: нейросеть не помнит вас. Каждый запрос — первое знакомство. Open WebUI хранит историю автоматически.',
  'Все запросы через LiteLLM — строгий кассир. Redis запоминает повторяющиеся вопросы.',
  'Преподаватель видит всё через Langfuse. Кто работает, кто завис — очевидно.',
  'Что получает учащийся? Реальный опыт с нейросетями — сам, своими руками.',
  'Личный кабинет с историей. Любой ноутбук — всё в браузере.',
  'Преподаватель не ходит по рядам — видит всех одновременно.',
  'В конце курса — готовый проект. Мини-сериал: сценарий, картинки, озвучка. Не теория. Продукт.',
];

function getHash(text, voice) {
  return createHash('md5').update(`${text}:${voice}`).digest('hex');
}

async function generateElevenLabs(text, apiKey) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs error ${res.status}: ${err}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  // Берём ключ из .env
  const envPath = join(__dirname, '../.env');
  let apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey && existsSync(envPath)) {
    const env = (await import('node:fs')).readFileSync(envPath, 'utf8');
    const match = env.match(/ELEVENLABS_API_KEY=(.+)/);
    if (match) apiKey = match[1].trim();
  }
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY не найден. Добавь в .env или export ELEVENLABS_API_KEY=...');
    process.exit(1);
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`📁 Кэш: ${CACHE_DIR}`);
  console.log(`🎙️ Голос: ${VOICE_NAME} (${VOICE})\n`);

  let generated = 0, skipped = 0;

  for (const text of TEXTS) {
    const hash = getHash(text, VOICE_NAME);
    const filePath = join(CACHE_DIR, `${hash}.mp3`);

    if (existsSync(filePath)) {
      console.log(`⏭️  Пропускаю (уже есть): ${text.substring(0, 50)}...`);
      skipped++;
      continue;
    }

    process.stdout.write(`🎤 Генерирую: ${text.substring(0, 50)}... `);
    try {
      const buffer = await generateElevenLabs(text, apiKey);
      writeFileSync(filePath, buffer);
      console.log(`✅ ${hash}.mp3 (${(buffer.length / 1024).toFixed(0)} KB)`);
      generated++;
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }

    // Пауза между запросами
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Готово: ${generated} сгенерировано, ${skipped} пропущено`);

  if (UPLOAD && generated > 0) {
    console.log('\n📤 Загружаю на сервер...');
    try {
      execSync(
        `rsync -az ${CACHE_DIR}/ root@159.194.223.55:/var/www/aidacamp-dev/current/audio/tts-cache/ -e "ssh -i ~/.ssh/aidacamp_prod"`,
        { stdio: 'inherit' }
      );
      console.log('✅ Загружено на dev.aidacamp.ru');
    } catch (e) {
      console.error('❌ Ошибка загрузки:', e.message);
    }
  } else if (generated > 0) {
    console.log('\nДля загрузки на сервер запусти:');
    console.log(`  rsync -az audio/tts-cache/ root@159.194.223.55:/var/www/aidacamp-dev/current/audio/tts-cache/ -e "ssh -i ~/.ssh/aidacamp_prod"`);
  }
}

main();
