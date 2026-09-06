// Service Worker for Dynamic Manifest Updates
const CACHE_NAME = 'timepay-dynamic-v2'; // Updated version to force cache clear

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Clear old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  // Clear all old caches and claim clients
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache on activate:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - handle dynamic manifest
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('dynamic_manifest.php')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone the response to cache it
          const responseClone = response.clone();
          
          // Cache the manifest
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
          
          return response;
        })
        .catch(() => {
          // Fallback to cached version if network fails
          return caches.match(event.request);
        })
    );
  }
});

// Handle manifest updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_MANIFEST') {
    // Force update of manifest
    caches.delete(CACHE_NAME).then(() => {
      console.log('Manifest cache cleared, forcing update');
    });
  }
});
