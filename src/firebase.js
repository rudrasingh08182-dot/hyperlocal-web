import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyAu0flLUCKGyPkr2yc1FXMocqJn1IFuNBI",
  authDomain: "zaplo-c8d22.firebaseapp.com",
  projectId: "zaplo-c8d22",
  storageBucket: "zaplo-c8d22.firebasestorage.app",
  messagingSenderId: "398032163373",
  appId: "1:398032163373:web:da47874cac729c7ab0dea4",
  measurementId: "G-VM1K6DEE74"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);
          
export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }
    
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    
    const token = await getToken(messaging, {
      vapidKey: 'BNO_31buOhhZBwaTSX5IMMHgfY-PZOKk863HM4PDqttAzGpsQeo5izJ_GZ9Kp9QKCOjDRA3m3MFc5S0i8sOh0ps',
      serviceWorkerRegistration: registration
    });
    console.log('FCM Token:', token);
    return token;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
};
export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });