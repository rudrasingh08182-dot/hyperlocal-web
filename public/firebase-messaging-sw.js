importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

self.skipWaiting();

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
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
  });
});