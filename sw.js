const CACHE_NAME = 'amblyopia-static-v1';
const OFFLINE_CACHE = 'amblyopia-offline-v1';

// Static assets - use relative paths that work under the base prefix
const STATIC_ASSETS = [
  '/amblyopia-training/',
  '/amblyopia-training/index.html',
  '/amblyopia-training/eye.svg',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {}),
      caches.open(OFFLINE_CACHE),
    ])
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME && n !== OFFLINE_CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Skip API/socket requests
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/fhir/')) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || new Response('离线', { status: 503 })))
  );
});
