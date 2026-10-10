// ATHAR Service Worker - Background Notifications & Offline Cache
const CACHE_NAME = 'athar-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle system notification clicks (lock screen or status bar)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if open
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle message from client to show notification (even when page is hidden, minimized, or in background)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = {
      badge: '/icon.svg',
      icon: '/icon.svg',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [300, 150, 300, 150, 300],
      requireInteraction: true,
      ...options
    };
    event.waitUntil(self.registration.showNotification(title, finalOptions));
  }
});

// Handle background push if Web Push configured
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || 'أثر | ATHAR';
    const options = {
      body: data.body || '',
      icon: '/icon.svg',
      badge: '/icon.svg',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [300, 150, 300, 150, 300],
      requireInteraction: true,
      data: data.data || { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.warn('Push error in SW:', e);
  }
});
