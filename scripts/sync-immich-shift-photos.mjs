#!/usr/bin/env node
// Тянет альбомы "Смена N — YYYY" из self-hosted Immich (photos.aidacamp.ru) в единое
// медиа-хранилище сайта и прописывает привязку к смене в photo-index.json.
// Запуск НА СЕРВЕРЕ (там IMMICH_API_KEY и доступ к /var/www/aidacamp-media/):
//   IMMICH_API_KEY=$(grep '^IMMICH_API_KEY=' /opt/mcp/.env | cut -d= -f2-) \
//   node scripts/sync-immich-shift-photos.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createWriteStream } from 'node:fs';

const IMMICH_BASE = 'http://127.0.0.1:2283'; // локально на сервере, без внешнего SSL-хопа
const KEY = process.env.IMMICH_API_KEY;
if (!KEY) throw new Error('IMMICH_API_KEY не задан в окружении');

const MEDIA_ROOT = '/var/www/aidacamp-media/images/gallery';
const PHOTO_INDEX_PATH = new URL('../src/data/photo-index.json', import.meta.url);
const PER_SHIFT_LIMIT = 12; // не тянуть все 700+ фото альбома — только разумную подборку

async function immichGet(path) {
  const res = await fetch(`${IMMICH_BASE}${path}`, { headers: { 'x-api-key': KEY } });
  if (!res.ok) throw new Error(`Immich ${path} → HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const albums = await immichGet('/api/albums');
  const shiftAlbums = albums.filter(a => /^Смена\s+\d+\s+—\s+\d{4}$/.test(a.albumName));
  console.log(`Найдено ${shiftAlbums.length} сменных альбомов:`, shiftAlbums.map(a => a.albumName));

  const index = JSON.parse(readFileSync(PHOTO_INDEX_PATH, 'utf-8'));
  let added = 0;

  for (const album of shiftAlbums) {
    const num = album.albumName.match(/Смена\s+(\d+)/)[1];
    const shiftId = 'shift-' + num;
    const dir = `${MEDIA_ROOT}/smena-${num}`;
    mkdirSync(dir, { recursive: true });

    const detail = await immichGet(`/api/albums/${album.id}`);
    const assets = detail.assets
      .filter(a => a.type === 'IMAGE')
      .sort((a, b) => a.fileCreatedAt.localeCompare(b.fileCreatedAt))
      .slice(0, PER_SHIFT_LIMIT);

    let addedThisAlbum = 0; // отдельный счётчик на альбом — для точного лога (added ниже общий)
    for (const asset of assets) {
      const file = `smena-${num}/${asset.id}.jpg`;
      if (index.photos.some(p => p.file === file)) continue; // уже синкали — не дублируем

      const res = await fetch(`${IMMICH_BASE}/api/assets/${asset.id}/thumbnail?size=preview`, {
        headers: { 'x-api-key': KEY },
      });
      if (!res.ok) { console.warn(`пропуск ${asset.id}: HTTP ${res.status}`); continue; }
      await pipeline(res.body, createWriteStream(`${dir}/${asset.id}.jpg`));

      index.photos.push({
        file,
        tags: ['смена', shiftId],
        caption: `Фото со Смены ${num}`,
        shift: shiftId,
      });
      added++;
      addedThisAlbum++;
    }
    console.log(`${album.albumName}: рассмотрено ${assets.length}, из них новых ${addedThisAlbum}`);
  }

  writeFileSync(PHOTO_INDEX_PATH, JSON.stringify(index, null, 2) + '\n');
  console.log(`Итого добавлено ${added} фото с привязкой к смене в src/data/photo-index.json`);
}

main();
