// Чтение публичной папки Яндекс.Диска без токена и без перекачки файлов на сервер.
// Видео отдаёт сам Яндекс: мы только резолвим временную прямую ссылку и редиректим.

import { existsSync } from 'node:fs';

const API = 'https://cloud-api.yandex.net/v1/disk/public/resources';
const LOCAL_ROOT = '/var/www/aidacamp-media/videos/zashita';

/**
 * Локальная (например, с почищенным звуком) копия защиты, если она есть —
 * тогда отдаём её вместо прокси на Яндекс. Имя файла приходит только из
 * items, уже сверенных со списком с Яндекс.Диска (см. вызовы), так что
 * путь по конструкции не может выйти за пределы LOCAL_ROOT.
 */
export function localVideoUrl(shiftId: string, name: string): string | null {
  const path = `${LOCAL_ROOT}/${shiftId}/${name}`;
  return existsSync(path) ? `/videos/zashita/${shiftId}/${encodeURIComponent(name)}` : null;
}

export type YdiskItem = {
  name: string;
  /** имя без расширения — подпись под превью */
  title: string;
  path: string;
  size: number;
  preview: string | null;
};

type ListCache = { at: number; items: YdiskItem[] };
const cache = new Map<string, ListCache>();
// Ссылки на превью подписанные и живут недолго — держим кэш коротким.
const TTL_MS = 4 * 60 * 1000;

/** Список видео в публичной папке. Кэш на 10 минут: ссылки на превью подписанные и протухают. */
export async function listPublicVideos(publicKey: string): Promise<YdiskItem[]> {
  const hit = cache.get(publicKey);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.items;

  const url = `${API}?public_key=${encodeURIComponent(publicKey)}&limit=500&preview_size=XL&sort=name`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Яндекс.Диск ответил ${res.status}`);
  const data = (await res.json()) as {
    _embedded?: { items?: Array<Record<string, unknown>> };
  };

  const items: YdiskItem[] = (data._embedded?.items ?? [])
    .filter((i) => i.type === 'file' && i.media_type === 'video')
    .map((i) => {
      const name = String(i.name);
      return {
        name,
        title: name.replace(/\.[^.]+$/, ''),
        path: String(i.path ?? `/${name}`),
        size: Number(i.size ?? 0),
        preview: i.preview ? String(i.preview) : null,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  cache.set(publicKey, { at: Date.now(), items });
  return items;
}

/** Временная прямая ссылка на файл. Живёт минуты — резолвим на каждый запрос. */
export async function getDirectHref(publicKey: string, path: string): Promise<string | null> {
  const url = `${API}/download?public_key=${encodeURIComponent(publicKey)}&path=${encodeURIComponent(path)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = (await res.json()) as { href?: string };
  return data.href ?? null;
}
