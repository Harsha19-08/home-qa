const requestNotificationPermission = async () => {
  console.log('Checking notification support...');
  
  if (!('Notification' in window)) {
    console.log('❌ This browser does not support notifications');
    return false;
  }

  console.log('Current notification permission:', Notification.permission);

  if (Notification.permission === 'granted') {
    console.log('✅ Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    console.log('Requesting notification permission...');
    try {
      const permission = await Notification.requestPermission();
      console.log('Permission request result:', permission);
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  console.log('❌ Notifications are denied by user');
  return false;
};

const showNotification = (title, options = {}) => {
  console.log('Attempting to show notification:', { title, options });

  if (!('Notification' in window)) {
    console.log('❌ Cannot show notification - browser does not support notifications');
    return;
  }

  if (Notification.permission !== 'granted') {
    console.log('❌ Cannot show notification - permission not granted');
    return;
  }

  // Check if the page is visible
  if (document.visibilityState === 'visible') {
    console.log('ℹ️ Page is visible, notification might not show');
  }

  try {
    // Check if service worker is available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('Using service worker for notification');
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          ...defaultOptions,
          ...options,
          requireInteraction: true, // Keep notification until user interacts
          silent: false, // Play sound
        });
      });
    } else {
      const defaultOptions = {
        icon: '/notification-icon.png',
        badge: '/notification-badge.png',
        vibrate: [200, 100, 200],
        requireInteraction: true, // Keep notification until user interacts
        silent: false, // Play sound
        ...options,
      };

      console.log('Using standard notification API');
      new Notification(title, defaultOptions);
    }
    console.log('✅ Notification sent successfully');
  } catch (error) {
    console.error('Error showing notification:', error);
  }
};

export { requestNotificationPermission, showNotification }; 