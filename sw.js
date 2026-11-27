// Nippon Quest PWA — rutas relativas al scope para funcionar en GitHub Pages (/quest/).
const VERSION = 'nq22';
const CACHE_PREFIX = /^nq\d+$/;
const SCOPE_URL = new URL(self.registration.scope);

const FILES = [
  './',
  './index.html',
  './css/style.css?v=nq21',
  './js/main.js',
  './js/ui.js',
  './js/engine.js',
  './js/store.js',
  './js/sync.js',
  './js/data.js',
  './js/supabase-config.js',
  './js/radio.js',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/kuru.svg',
  './icons/kuru-main.svg',
  './icons/kuru-happy.svg',
  './icons/kuru-explain.svg',
  './icons/kuru-celebrate.svg',
  './icons/kuru-confused.svg',
  './icons/kuru-rest.svg',
  './icons/world-hiragana.svg',
  './icons/world-dakuten.svg',
  './icons/world-combinations.svg',
  './icons/world-katakana.svg',
  './icons/world-vocabulary.svg',
  './icons/world-conversation.svg'
];

const scopedUrl = path => new URL(path, SCOPE_URL);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Cada recurso se precarga de forma independiente: uno ausente no aborta la instalación.
    const results = await Promise.allSettled(FILES.map(async path => {
      const url = scopedUrl(path);
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`${response.status} ${url.pathname}`);
      await cache.put(url.href, response);
    }));

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(
          '[Nippon Quest SW] Recurso omitido de la precarga:',
          FILES[index],
          result.reason
        );
      }
    });

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => CACHE_PREFIX.test(key) && key !== VERSION)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (
    url.origin !== SCOPE_URL.origin ||
    !url.pathname.startsWith(SCOPE_URL.pathname)
  ) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);

    try {
      // Network-first: online users reciben los recursos más recientes.
      const response = await fetch(request);

      if (response && response.ok) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn(
            '[Nippon Quest SW] No se pudo guardar en caché:',
            request.url,
            error
          );
        }
        return response;
      }

      // Si la red responde con 4xx/5xx, preferir una copia válida ya guardada.
      const cached = await cache.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const fallback = await cache.match(scopedUrl('./index.html').href);
        if (fallback) return fallback;
      }

      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;

      if (request.mode === 'navigate') {
        const fallback = await cache.match(scopedUrl('./index.html').href);
        if (fallback) return fallback;
      }

      return new Response(
        'No hay conexión y este recurso no está guardado.',
        {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }
      );
    }
  })());
});
