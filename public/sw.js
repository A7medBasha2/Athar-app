// ATHAR Service Worker - 100% Offline-First Architecture, Audio Pack Caching & Lock Screen Support
const CACHE_NAME = 'athar-cache-v9';
const OFFLINE_AUDIO_CACHE_NAME = 'athar-offline-audio-v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/athar-royal-icon.jpg',
  '/athar-royal-icon.png',
  '/icon.svg',
  '/manifest.json',
  '/adhan-scenes/fajr.jpg',
  '/adhan-scenes/dhuhr.jpg',
  '/adhan-scenes/asr.jpg',
  '/adhan-scenes/maghrib.jpg',
  '/adhan-scenes/isha.jpg',
  '/audio/adhan_alafasy.mp3',
  '/audio/adhan_fajr_alafasy.mp3',
  '/audio/adhan_makkah.mp3',
  '/audio/adhan_madinah.mp3',
  '/audio/adhan_alaqsa.mp3',
  '/audio/alarm_muzzammil_alafasy.mp3',
  '/audio/alarm_quran_fajr_abdulbasit.mp3',
  '/audio/alarm_quran_fajr_alafasy.mp3',
  '/audio/alarm_sajdah_alafasy.mp3',
  '/audio/salat_khayr_alafasy_2.mp3',
  '/audio/salat_khayr_min_nawm.mp3',
  '/audio/dua_after_adhan.mp3',
  '/audio/iqamah.mp3',
  '/audio/salawat.mp3',
  '/audio/wird.mp3'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching some assets skipped:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== OFFLINE_AUDIO_CACHE_NAME)
          .map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first for audio, icons, fonts; Network-first for HTML & source modules
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never intercept Vite internal client or HMR requests
  if (
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // 1. Check downloaded audio packs cache or static audio cache first
  if (
    url.pathname.startsWith('/audio/') ||
    url.pathname.endsWith('.mp3') ||
    url.hostname.includes('everyayah.com') ||
    url.hostname.includes('mp3quran.net') ||
    url.hostname.includes('alquran.cloud')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(OFFLINE_AUDIO_CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // 2. HTML Navigation requests: Network-first with offline fallback to cached /index.html
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 3. Other static assets (Images, Manifest, Icons)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Handle system notification clicks & action buttons (lock screen or status bar)
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const notifData = notification.data || {};
  notification.close();

  if (action === 'dismiss') {
    return;
  }

  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_ACTION_CLICKED',
            action: action || (notifData.hasAutoPlay ? 'play' : 'open'),
            notificationType: notifData.type,
            audioUrl: notifData.audioUrl
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle message from client to show notification (even when page is hidden, minimized, or screen locked)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    const finalOptions = {
      badge: '/icon.svg',
      icon: '/athar-royal-icon.jpg',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [250, 100, 250, 100, 300],
      requireInteraction: true,
      renotify: true,
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
      tag: 'athar-unified-alert',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [250, 100, 250, 100, 300],
      requireInteraction: true,
      renotify: true,
      data: data.data || { url: '/' }
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.warn('Push error in SW:', e);
  }
});
