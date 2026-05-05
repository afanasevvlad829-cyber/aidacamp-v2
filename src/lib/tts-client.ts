/**
 * TTS Client Helper
 * Работает с MSAPI TTS сервисом (ElevenLabs через API)
 * Кеширует аудио локально, выполняет запросы на генерацию через /api/tts
 */

const SERVICE_ID = '9c17b87c14d1f7516a76dd5dbf6441fab22998b185bf5a07c55b2c9f98034f61';
const TTS_CACHE = new Map<string, string>();  // text:voiceId -> URL

export interface TTSOptions {
  text: string;
  voice?: string;
  serviceId?: string;
}

export interface TTSResponse {
  success: boolean;
  url?: string;
  cached?: boolean;
  serviceId?: string;
  error?: string;
}

/**
 * Генерируем аудиофайл текста через MSAPI TTS
 */
export async function generateTTS(options: TTSOptions): Promise<string> {
  const { text, voice = 'onyx', serviceId = SERVICE_ID } = options;

  // Проверяем локальный кеш
  const cacheKey = `${text}:${voice}`;
  if (TTS_CACHE.has(cacheKey)) {
    return TTS_CACHE.get(cacheKey)!;
  }

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, serviceId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `TTS failed with status ${response.status}`);
    }

    const result: TTSResponse = await response.json();
    if (result.success && result.url) {
      TTS_CACHE.set(cacheKey, result.url);
      return result.url;
    } else {
      throw new Error(result.error || 'Unknown TTS error');
    }
  } catch (error) {
    console.error('TTS generation failed:', error);
    throw error;
  }
}

/**
 * Предварительная загрузка аудио (опционально)
 */
export async function preloadTTS(texts: string[], voice: string = 'onyx'): Promise<void> {
  const promises = texts.map(text =>
    generateTTS({ text, voice }).catch(err => console.warn(`Preload failed for text: ${err.message}`))
  );
  await Promise.all(promises);
}

/**
 * Используется в ai-studio для воспроизведения озвучки
 */
export async function playTTS(text: string, voice: string = 'onyx'): Promise<HTMLAudioElement> {
  const audioUrl = await generateTTS({ text, voice });
  const audio = new Audio(audioUrl);
  audio.play().catch(e => console.warn('Audio play blocked or failed:', e));
  return audio;
}
