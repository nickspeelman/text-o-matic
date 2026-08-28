const APP_VERSION = '3.1.1';
const CACHE_NAME = `text-o-matic-v${APP_VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];
const OFFLINE_LIBRARY_ASSETS = [
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
  'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
];

async function cacheOfflineLibraries() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(OFFLINE_LIBRARY_ASSETS.map(async url => {
    const existing = await cache.match(url);
    if (existing) return;
    const response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
    await cache.put(url, response);
  }));
}

async function offlineReady() {
  const cache = await caches.open(CACHE_NAME);
  const core = await Promise.all(CORE_ASSETS.map(asset => cache.match(asset)));
  const libs = await Promise.all(OFFLINE_LIBRARY_ASSETS.map(asset => cache.match(asset)));
  return core.every(Boolean) && libs.every(Boolean);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => cacheOfflineLibraries())
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await cacheOfflineLibraries();
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'CHECK_OFFLINE_READY') return;
  event.waitUntil((async () => {
    const ready = await offlineReady();
    event.source?.postMessage({ type: 'OFFLINE_READY_STATUS', ready, version: APP_VERSION });
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (sameOrigin) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
    );
    return;
  }

  if (OFFLINE_LIBRARY_ASSETS.includes(event.request.url)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }))
    );
  }
});
