// Minimal offline cache. This app is 100% static content — no accounts, no
// personal data, nothing server-side — and now has no build step either
// (plain ES modules from /src + /vendor). A cache-first strategy for the
// app shell plus a network-with-cache-fallback pass-through for everything
// else is enough to let a guest reopen it with no signal once loaded.
const CACHE = 'ssr-guide-v2';

// Precache the module entry graph + vendor libs + styles so the very first
// reload-after-close works offline; everything else (tiles, guide images,
// lazily-hit modules) is cached as it's fetched by the handler below.
const SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/vendor/preact.module.js',
  '/vendor/hooks.module.js',
  '/vendor/htm.module.js',
  '/vendor/leaflet.js',
  '/vendor/leaflet.css',
  '/src/styles/organic.css',
  '/src/styles/app.css',
  '/src/main.js',
  '/src/preact.js',
  '/src/App.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Individually so one 404 doesn't abort the whole precache.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
