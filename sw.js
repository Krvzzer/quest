const VERSION = 'nq17';

const FILES = [
  './',
  './index.html',
  './css/style.css?v=nq17',
  './js/main.js',
  './js/ui.js',
  './js/engine.js',
  './js/store.js',
  './js/sync.js',
  './js/data.js',
  './js/supabase-config.js',
  './manifest.webmanifest',
  './icons/kuru.svg',
  './icons/kuru-guide.svg',
  './icons/world-hiragana.svg',
  './icons/world-dakuten.svg',
  './icons/world-combinations.svg',
  './icons/world-katakana.svg',
  './icons/world-vocabulary.svg',
  './icons/world-conversation.svg',

  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== VERSION)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const fallback = await caches.match('./index.html');
          if (fallback) return fallback;
        }

        return new Response('No hay conexión y este recurso no está guardado.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      })
  );
});