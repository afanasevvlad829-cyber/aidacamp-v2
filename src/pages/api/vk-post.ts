export const prerender = false;
import type { APIRoute } from 'astro';
import { fetchWithTimeout } from '../../lib/fetchWithTimeout';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';

const CONFIG_PATH = '/var/www/aidacamp-dev/vk-config.json';
const CONFIG_PATH_LOCAL = join(process.cwd(), 'vk-config.json');
const VK_API_VERSION = '5.131'; // Последняя поддерживаемая версия

// --- helpers ----------------------------------------------------------------

async function readConfig(): Promise<Record<string, string>> {
  for (const p of [CONFIG_PATH, CONFIG_PATH_LOCAL]) {
    try {
      const raw = await readFile(p, 'utf8');
      return JSON.parse(raw);
    } catch { /* skip */ }
  }
  return {};
}

interface PhotoUploadResponse {
  server?: number;
  photo?: string;
  hash?: string;
  aid?: number;
  pid?: number;
  error?: { error_code: number; error_msg: string };
}

async function uploadPhotoToWall(
  token: string,
  userId: string
): Promise<{ photo_id: string } | null> {
  // Это заглушка для реального примера
  // На практике нужно скачать фото, загрузить на сервер VK и получить photo_id
  return null;
}

// --- POST: создать пост -------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, imageUrl, publishDate } = body;

    if (!text?.trim()) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Текст поста обязателен' }),
        { status: 400 }
      );
    }

    if (text.length > 63206) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Текст не должен превышать 63206 символов',
        }),
        { status: 400 }
      );
    }

    const cfg = await readConfig();
    const token = cfg.token ?? import.meta.env.VK_TOKEN ?? '';
    const userId = cfg.userId ?? import.meta.env.VK_USER_ID ?? '';

    if (!token || !userId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            'VK не настроен. Сначала подключи аккаунт через POST /api/vk-auth с { token, userId }',
        }),
        { status: 400 }
      );
    }

    // Валидация publishDate если передан
    let publishDateTimestamp: number | undefined;
    if (publishDate) {
      const date = new Date(publishDate);
      if (isNaN(date.getTime())) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              'Неверный формат даты. Используй ISO 8601 (YYYY-MM-DDTHH:mm:ss) или Unix timestamp',
          }),
          { status: 400 }
        );
      }
      publishDateTimestamp = Math.floor(date.getTime() / 1000);

      // Дата должна быть в будущем (макс 9 дней)
      const now = Math.floor(Date.now() / 1000);
      const maxFuture = now + 9 * 24 * 60 * 60;
      if (publishDateTimestamp <= now) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Дата публикации должна быть в будущем',
          }),
          { status: 400 }
        );
      }
      if (publishDateTimestamp > maxFuture) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: 'Дата публикации не может быть более чем на 9 дней в будущем',
          }),
          { status: 400 }
        );
      }
    }

    // Собираем параметры для VK API
    const params = new URLSearchParams({
      owner_id: userId,
      message: text.trim(),
      v: VK_API_VERSION,
      access_token: token,
    });

    // Если есть фото — добавляем
    if (imageUrl) {
      try {
        const photoResponse = await uploadPhotoToWall(token, userId);
        if (photoResponse?.photo_id) {
          params.set('attachments', photoResponse.photo_id);
        }
      } catch (e) {
        console.error('Ошибка загрузки фото:', e);
        // Продолжаем без фото, но логируем ошибку
      }
    }

    // Если есть отложенная дата — добавляем
    if (publishDateTimestamp) {
      params.set('publish_date', String(publishDateTimestamp));
    }

    // Вызываем VK API
    const apiUrl = `https://api.vk.com/method/wall.post?${params.toString()}`;
    const apiRes = await fetchWithTimeout(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const result = (await apiRes.json()) as {
      response?: { post_id: number };
      error?: { error_code: number; error_msg: string };
    };

    if (result.error) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `VK API: ${result.error.error_msg} (код ${result.error.error_code})`,
        }),
        { status: 400 }
      );
    }

    if (!result.response?.post_id) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Неожиданный ответ от VK API',
          detail: result,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        postId: result.response.post_id,
        message: publishDateTimestamp
          ? `Пост запланирован на ${new Date(publishDateTimestamp * 1000).toLocaleString('ru-RU')}`
          : 'Пост опубликован',
      }),
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};

// --- GET: получить информацию -------------------------------------------------------

export const GET: APIRoute = async () => {
  try {
    const cfg = await readConfig();
    const token = cfg.token ?? import.meta.env.VK_TOKEN ?? '';
    const userId = cfg.userId ?? import.meta.env.VK_USER_ID ?? '';

    return new Response(
      JSON.stringify({
        ok: true,
        configured: !!token && !!userId,
        userId: userId ? parseInt(userId) : null,
      }),
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500 });
  }
};
