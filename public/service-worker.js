// public/service-worker.js
// ─────────────────────────────────────────────────────────────
// Zaplo PWA Service Worker
// Handles caching for offline support
// ─────────────────────────────────────────────────────────────
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAu0flLUCKGyPkr2yc1FXMocqJn1IFuNBI",
  authDomain: "zaplo-c8d22.firebaseapp.com",
  projectId: "zaplo-c8d22",
  storageBucket: "zaplo-c8d22.firebasestorage.app",
  messagingSenderId: "398032163373",
  appId: "1:398032163373:web:da47874cac729c7ab0dea4"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png'
  });
});



const CACHE_NAME = 'zaplo-v2'; // ⬅️ bumped v1 → v2 to force-clear old stale cache once

// Files to cache for offline use
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];
// Install event — cache static assets (NOT '/' anymore — see fetch handler below)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Zaplo SW: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip API calls — always fetch from network
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Navigation requests (page loads / index.html) — NETWORK FIRST
  // This is the fix: always try to get the latest app shell,
  // only fall back to cache if the network is unavailable.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  // Everything else (JS/CSS/images with hashed filenames) — cache first is fine,
  // since CRA gives each build unique filenames, so this never goes stale.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'Zaplo';
  const options = {
    body:    data.body || 'You have a new notification',
    icon:    '/icons/icon-192x192.png',
    badge:   '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/buyer' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/buyer')
  );
});