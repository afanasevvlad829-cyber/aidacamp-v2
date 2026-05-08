/**
 * Service Worker для PWA «Памятка в лагерь» (/p/[lid]).
 *
 * Стратегия:
 *  - HTML страницы /p/* — stale-while-revalidate
 *    (показываем мгновенно из кеша, фоном обновляем — пользователь видит свежую версию при следующем открытии).
 *  - Статика (картинки, css, js, документы /docs/pamyatka/) — cache-first.
 *  - Видео Kinescope — НЕ кешируем (тяжёлое + грузится из их CDN).
 *  - При апдейте версии CACHE_NAME — старый кеш удаляется в activate.
 *
 * Тут НЕТ push-handler'а — это отдельный этап.
 */

const CACHE_NAME = 'pamyatka-v2';
const STATIC_CACHE = 'pamyatka-static-v2';

// Ассеты которые имеет смысл предзагрузить при install
const PRECACHE = [
  '/images/pamyatka/icon-180.png?v=2',
  '/images/pamyatka/icon-192.png?v=2',
  '/images/pamyatka/icon-512.png?v=2',
  '/manifest-pamyatka.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function isHtmlRequest(req) {
  return req.mode === 'navigate' ||
         (req.method === 'GET' && req.headers.get('accept')?.includes('text/html'));
}

function isStaticAsset(url) {
  return /\/images\/pamyatka\//.test(url.pathname)
      || /\/docs\/pamyatka\//.test(url.pathname)
      || /\.(css|js|woff2?|ttf|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Только same-origin для HTML/static. Внешние (Kinescope, Метрика) — пускаем без кеша.
  if (url.origin !== self.location.origin) return;

  // HTML страниц памятки — stale-while-revalidate
  if (isHtmlRequest(req) && url.pathname.startsWith('/p/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkPromise = fetch(req).then((res) => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return cached || networkPromise || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  // Статика — cache-first с фоновым обновлением
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) {
          // Обновляем фоном (но не ждём)
          fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
          }).catch(() => {});
          return cached;
        }
        try {
          const res = await fetch(req);
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return new Response('Offline', { status: 503 });
        }
      })
    );
  }
});
