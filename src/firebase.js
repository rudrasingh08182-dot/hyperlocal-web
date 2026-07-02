export const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    return 'browser-notification-enabled';
  } catch (err) {
    console.error('Notification error:', err);
    return null;
  }
};

export const showNotification = (title, body) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
    });
  }
};