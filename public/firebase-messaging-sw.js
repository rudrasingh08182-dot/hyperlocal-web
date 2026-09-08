// public/firebase-messaging-sw.js
// Service Worker — background notifications handle karta hai (app band ho ya minimize ho)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyAu0flLUCKGyPkr2yc1FXMocqJn1IFuNBI",
  authDomain:        "zaplo-c8d22.firebaseapp.com",
  projectId:         "zaplo-c8d22",
  storageBucket:   " zaplo-c8d22.firebasestorage.app",
  messagingSenderId: "398032163373",
  appId:             "1:398032163373:web:6c756386e7a1783fb0dea4"
});

const messaging = firebase.messaging();

// Background message handle karo
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const { title, body } = payload.notification || {};
  const notificationTitle = title || 'Zaplo Notification';
  const notificationOptions = {
    body: body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: payload.data || {},
    // Click karne par app open ho
    click_action: '/',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handle karo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});