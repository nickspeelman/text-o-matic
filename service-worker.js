const APP_VERSION = '0.1.10';
const CACHE_NAME = `text-o-matic-v${APP_VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;

  if (sameOrigin) {
    // Network-first for our own app shell. This prevents an older service worker
    // from serving stale HTML/JS while a newer deployment is already available.
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

  // Runtime-cache pinned third-party libraries after the first successful fetch.
  if (
    (requestUrl.hostname === 'cdn.jsdelivr.net' && requestUrl.pathname.includes('/qrcodejs@1.0.0/')) ||
    (requestUrl.hostname === 'cdn.sheetjs.com' && requestUrl.pathname.includes('/xlsx-0.20.3/'))
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      }))
    );
  }
});
