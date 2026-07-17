export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../lib/fetchWithTimeout';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const CACHE_DIR = '/var/www/aidacamp-dev/current/audio/tts-cache';
const PUBLIC_URL_BASE = 'https://dev.aidacamp.ru/audio/tts-cache';

// Инициализация папки кеша
function ensureCacheDir() {
  if (!existsSync(CACHE_DIR)) {
    mkdirSync(CACHE_DIR, { recursive: true });
  }
}

// Генерируем хеш от текста для кеширования
function getAudioHash(text: string, voiceId: string): string {
  return createHash('md5').update(`${text}:${voiceId}`).digest('hex');
}

// Вызов ElevenLabs API для генерации речи
async function generateAudioElevenLabs(text: string, voiceId: string = 'rachel'): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  // Генерация аудио дольше обычного API-вызова — таймаут 30с
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',  // Последняя высококачественная модель ElevenLabs
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  }, 30000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} ${error}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

// Fallback через OpenAI TTS
async function generateAudioOpenAI(text: string): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured for fallback TTS');
  }

  const response = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      model: 'tts-1',
      voice: 'nova',
      response_format: 'mp3',
    }),
  }, 30000);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS error: ${response.status} ${error}`);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

// Основной хендлер
export const POST: APIRoute = async ({ request }) => {
  try {
    ensureCacheDir();

    // Парсим запрос
    const data = await request.json();
    const text = data.text?.trim();
    const voiceId = data.voice || 'rachel';  // Дефолтный голос
    const serviceId = data.serviceId || '9c17b87c14d1f7516a76dd5dbf6441fab22998b185bf5a07c55b2c9f98034f61';

    if (!text) {
      return new Response(JSON.stringify({ error: 'Text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Проверяем кеш
    const hash = getAudioHash(text, voiceId);
    const cachedPath = join(CACHE_DIR, `${hash}.mp3`);

    if (existsSync(cachedPath)) {
      return new Response(JSON.stringify({
        success: true,
        url: `${PUBLIC_URL_BASE}/${hash}.mp3`,
        cached: true,
        serviceId,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Генерируем новый audio
    let audioBuffer: Buffer;
    try {
      audioBuffer = await generateAudioElevenLabs(text, voiceId);
    } catch (elevenLabsError) {
      console.warn('ElevenLabs failed, trying OpenRouter:', elevenLabsError);
      audioBuffer = await generateAudioOpenAI(text);
    }

    // Сохраняем в кеш
    writeFileSync(cachedPath, audioBuffer);

    return new Response(JSON.stringify({
      success: true,
      url: `${PUBLIC_URL_BASE}/${hash}.mp3`,
      cached: false,
      serviceId,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'TTS generation failed',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
