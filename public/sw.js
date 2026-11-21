// Service Worker for Tranvía Zaragoza (Web & Android PWA)
const CACHE_NAME = 'tz-v5-tram-icon';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json?v=2026',
  '/tram-favicon.png',
  '/tram-favicon.ico',
  '/tram-icon-192.png',
  '/tram-icon-512.png',
  '/tram-icon-180.png',
  '/tram-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((k) => {
            if (k !== CACHE_NAME) {
              return caches.delete(k);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Real-time Push Notifications (Triggered by FCM / Web Push server even when app is closed on Android!)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Tranvía Zaragoza', body: event.data.text() };
    }
  }

  const title = data.title || 'Tranvía Zaragoza L1';
  const options = {
    body: data.body || data.message || 'Tranvía aproximándose a tu parada.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'tz-tram-arrival',
    renotify: true,
    requireInteraction: true,
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Ver parada' },
      { action: 'dismiss', title: 'Entendido' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event: focus or open the app on the phone
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Network-first strategy for navigation and icons, cache-fallback for offline
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API calls from cache interception
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Network-first for navigation and icons so new versions appear instantly
  if (event.request.mode === 'navigate' || url.pathname.includes('icon') || url.pathname.includes('apple-touch') || url.pathname.includes('favicon')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
