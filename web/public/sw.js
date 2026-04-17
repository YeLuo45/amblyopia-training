const CACHE_NAME = 'amblyopia-training-v1';
const STATIC_CACHE = 'amblyopia-static-v1';
const OFFLINE_CACHE = 'amblyopia-offline-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/eye.svg',
  '/src/main.tsx',
  '/src/index.css',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
      caches.open(OFFLINE_CACHE),
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== OFFLINE_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API requests differently
  if (url.pathname.startsWith('/api/')) {
    // Try network first, fallback to offline data
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET API responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Return offline response if network fails
          return caches.match(request).then((cached) => {
            if (cached) return cached;

            // Return offline indicator for training data
            if (url.pathname.startsWith('/api/training/')) {
              return new Response(
                JSON.stringify({ offline: true, message: '离线模式' }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' },
                }
              );
            }

            // Return 503 for other API requests
            return new Response('离线模式', { status: 503 });
          });
        })
    );
    return;
  }

  // For static assets, cache-first strategy
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        // Update cache in background
        fetch(request).then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, response));
          }
        });
        return cached;
      }

      // Not in cache, fetch from network
      return fetch(request).then((response) => {
        if (!response.ok) return caches.match(request);

        // Cache successful responses
        const clone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});

// Listen for sync event (background sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-training-data') {
    event.waitUntil(syncTrainingData());
  }
});

// Listen for messages from clients
self.addEventListener('message', (event) => {
  if (event.data === 'sync') {
    event.waitUntil(syncTrainingData());
  }
});

// Sync offline training data
async function syncTrainingData() {
  try {
    // Get all offline data from IndexedDB
    // This would be implemented in the app's offline storage module
    console.log('Syncing offline training data...');

    // Send to server
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sync: true }),
    });

    if (response.ok) {
      console.log('Sync successful');
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}
