// src/services/fcmToken.js
// FCM token request + backend mein save karna

import { messaging, getToken, onMessage } from '../firebase';
import API from './api';

const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;

// Firebase config (SW ko postMessage se bhejenge)
const FIREBASE_CONFIG = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

// Service Worker ko Firebase config bhejo
const sendConfigToSW = (swReg) => {
  const worker = swReg.active || swReg.installing || swReg.waiting;
  if (worker) {
    worker.postMessage({ type: 'FIREBASE_CONFIG', config: FIREBASE_CONFIG });
  }
  // Naye activate hone wale SW ke liye bhi bhejo
  swReg.addEventListener('updatefound', () => {
    const newWorker = swReg.installing;
    if (!newWorker) return;
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'activated') {
        newWorker.postMessage({ type: 'FIREBASE_CONFIG', config: FIREBASE_CONFIG });
      }
    });
  });
};

/**
 * Notification permission maango, FCM token lo, backend mein save karo.
 * Buyer aur Delivery dono ke liye.
 */
export const registerFCMToken = async (role = 'user') => {
  if (!messaging) {
    console.warn('FCM not supported on this browser/device');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied by user');
      return;
    }

    // Service worker register karo
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // SW ko Firebase config bhejo (background notifications ke liye)
    sendConfigToSW(swReg);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      console.warn('FCM token not generated');
      return;
    }

    // Already saved token check karo (repeated API calls avoid karo) — role-wise key taaki
    // ek hi browser mein alag roles (seller/buyer/delivery) apna apna token save kar saken
    const storageKey = `zaplo_fcm_token_${role}`;
    const savedToken = localStorage.getItem(storageKey);
    if (savedToken === token) return;

    // Backend mein save karo — role ke hisaab se sahi endpoint
    if (role === 'seller') {
      await API.post('/sellers/fcm-token', { token });
    } else {
      await API.patch('/auth/fcm-token', { token });
    }
    localStorage.setItem(storageKey, token);
    console.log(`✅ FCM token registered successfully (${role})`);
  } catch (err) {
    console.error('FCM registration error:', err.message);
  }
};

/**
 * Foreground notification listener — jab app khuli ho toh ye fire hota hai
 * @param {function} onNotification - callback({ title, body, data })
 * @returns {function} unsubscribe function
 */
export const onForegroundMessage = (onNotification) => {
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'Zaplo';
    const body  = payload.notification?.body  || '';
    const data  = payload.data || {};
    onNotification({ title, body, data });
  });

  return unsubscribe;
};