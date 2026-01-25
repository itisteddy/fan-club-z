// Service Worker for Fan Club Z PWA
const CACHE_VERSION = '2026-01-24-01'; // Bump on every deploy to invalidate old caches
const CACHE_NAME = `fanclubz-cache-${CACHE_VERSION}`;
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const API_BASE = (() => {
  try {
    const origin = self.location.origin;
    const url = new URL(origin);
    const hostname = url.hostname || '';
    const isLocal =
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('192.168.') ||
      hostname.endsWith('.local');
    if (isLocal) {
      return `${url.protocol}//${hostname}:3001`;
    }
  } catch (err) {
    console.warn('SW: Failed to detect origin for API_BASE, defaulting to production', err);
  }
  return 'https://fan-club-z.onrender.com';
})();

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('PWA: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('PWA: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // CRITICAL: NEVER cache auth-related requests
  // This prevents OAuth callbacks from being served from cache
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/auth') || 
      url.searchParams.has('code') || 
      url.searchParams.has('access_token') ||
      url.searchParams.has('refresh_token') ||
      url.hash.includes('access_token') ||
      url.pathname.startsWith('/api')) {
    // Network-only for auth and API requests
    if (import.meta.env.DEV) {
      console.log('[sw] bypass auth request', url.pathname);
    }
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle background sync for offline predictions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync-predictions') {
    event.waitUntil(syncPredictions());
  }
});

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update from Fan Club Z!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Predictions',
        icon: '/icons/icon-96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Fan Club Z', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/discover')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Background sync function
async function syncPredictions() {
  try {
    // Get pending predictions from IndexedDB
    const pendingPredictions = await getPendingPredictions();
    
    for (const prediction of pendingPredictions) {
      try {
        const response = await fetch(`${API_BASE}/api/predictions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(prediction.data)
        });

        if (response.ok) {
          // Remove from pending queue
          await removePendingPrediction(prediction.id);
        }
      } catch (error) {
        console.log('Sync failed for prediction:', prediction.id);
      }
    }
  } catch (error) {
    console.log('Background sync failed:', error);
  }
}

// Helper functions for IndexedDB operations
async function getPendingPredictions() {
  // Implementation would use IndexedDB to get pending predictions
  return [];
}

async function removePendingPrediction(id) {
  // Implementation would remove prediction from IndexedDB
}