// ATHAR Service Worker - Optimized Data-Saver & Offline-First Architecture
const CACHE_NAME = 'athar-cache-v10';
const OFFLINE_AUDIO_CACHE_NAME = 'athar-offline-audio-v2';

// Lightweight pre-cache: only UI shell and brand identity assets.
// Audio files and heavy images are cached on-demand when played/requested, saving up to 30MB upfront data.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/royal-athar-icon.png',
  '/athar-royal-icon.jpg',
  '/athar-royal-icon.png',
  '/icon.svg',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-caching assets warning:', err);
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

/**
 * Helper to construct a partial Content (206) response from a cached 200 response
 * so browser HTML5 Audio elements with Range requests can seamlessly play from cache without re-downloading!
 */
async function createRangeResponse(request, fullResponse) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return fullResponse;

  const arrayBuffer = await fullResponse.arrayBuffer();
  const bytesMatch = rangeHeader.match(/bytes=(\d+)-(\d+)?/);
  if (!bytesMatch) return fullResponse;

  const start = parseInt(bytesMatch[1], 10);
  const end = bytesMatch[2] ? parseInt(bytesMatch[2], 10) : arrayBuffer.byteLength - 1;

  if (start >= arrayBuffer.byteLength) {
    return new Response(null, {
      status: 416,
      statusText: 'Range Not Satisfiable',
      headers: { 'Content-Range': `bytes */${arrayBuffer.byteLength}` },
    });
  }

  const sliced = arrayBuffer.slice(start, end + 1);
  return new Response(sliced, {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': fullResponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${start}-${end}/${arrayBuffer.byteLength}`,
      'Content-Length': String(sliced.byteLength),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

// Cache-first for audio, images, icons, fonts; Network-first for HTML
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

  // 1. Data-saving audio caching (Local audio, EveryAyah, Mp3Quran, AlQuran.cloud, Archive.org, GitHub audio)
  if (
    url.pathname.startsWith('/audio/') ||
    url.pathname.endsWith('.mp3') ||
    url.pathname.endsWith('.wav') ||
    url.pathname.endsWith('.m4a') ||
    url.pathname.endsWith('.ogg') ||
    url.hostname.includes('everyayah.com') ||
    url.hostname.includes('mp3quran.net') ||
    url.hostname.includes('alquran.cloud') ||
    url.hostname.includes('archive.org') ||
    url.hostname.includes('githubusercontent.com')
  ) {
    event.respondWith(
      (async () => {
        const audioCache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
        // Look up by clean URL without Range header
        const cacheKey = new Request(url.href);
        const cached = await audioCache.match(cacheKey);

        if (cached) {
          return createRangeResponse(event.request, cached);
        }

        try {
          // Fetch complete file from network once without range to cache it permanently
          const networkRequest = new Request(url.href, {
            headers: { 'Accept': 'audio/*, */*' },
            mode: url.origin === self.location.origin ? 'same-origin' : 'cors',
          });

          const networkResponse = await fetch(networkRequest).catch(() => fetch(event.request));

          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 206)) {
            // Clone and store the clean 200 response in cache if full
            if (networkResponse.status === 200) {
              audioCache.put(cacheKey, networkResponse.clone()).catch(() => {});
            }
            return createRangeResponse(event.request, networkResponse);
          }
          return networkResponse;
        } catch {
          if (cached) return createRangeResponse(event.request, cached);
          return new Response('', { status: 408 });
        }
      })()
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

  // 3. Static assets (Images, Fonts, Adhan Scenes, Icons) - Cache First for data saving
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/adhan-scenes/') ||
     url.pathname.endsWith('.jpg') ||
     url.pathname.endsWith('.png') ||
     url.pathname.endsWith('.svg') ||
     url.pathname.endsWith('.woff2') ||
     url.pathname.endsWith('.css') ||
     url.pathname.endsWith('.js'))
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }
});

// Legacy Web Push Subsystem Purged: AtharNotificationManager is the single source of truth
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        if (self.registration && self.registration.pushManager) {
          const sub = await self.registration.pushManager.getSubscription();
          if (sub) {
            await sub.unsubscribe();
          }
        }
      } catch (e) {}
    })()
  );
});

// ============================================================================
// ATHAR ROYAL BACKGROUND ALARMS & HIGH-PRIORITY NOTIFICATIONS SYSTEM
// Ensures Adhan & Royal Reminders fire accurately even when app is closed / phone locked
// ============================================================================

let activeAlarms = [];
let alarmCheckInterval = null;

function startAlarmWorker() {
  if (alarmCheckInterval) clearInterval(alarmCheckInterval);
  alarmCheckInterval = setInterval(checkPendingAlarms, 15000); // Check every 15s
}

async function checkPendingAlarms() {
  const now = Date.now();
  const due = activeAlarms.filter((a) => a.triggerAtMs && a.triggerAtMs <= now && !a.fired);

  for (const alarm of due) {
    alarm.fired = true;
    try {
      await fireRoyalNotification(alarm);
    } catch (e) {
      console.warn('[SW] Error firing royal notification:', e);
    }
  }

  // Purge fired alarms older than 1 hour
  activeAlarms = activeAlarms.filter((a) => !a.fired || (now - a.triggerAtMs < 3600000));
}

async function fireRoyalNotification(alarm) {
  const isAdhan = alarm.type === 'royal_adhan';
  const title = alarm.title || (isAdhan ? `حان الآن موعد أذان ${alarm.prayerName || 'الصلاة'} 🕌` : 'تنبيه أثر الملكي ✨');
  const body = alarm.body || (isAdhan ? 'حي على الصلاة • حي على الفلاح' : 'افتح أثر للاطلاع على التنبيه');

  const options = {
    body,
    icon: '/athar-royal-icon.png',
    badge: '/royal-athar-icon.png',
    vibrate: [500, 250, 500, 250, 500, 500, 1000],
    tag: `athar-royal-${alarm.id || Date.now()}`,
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: {
      url: alarm.url || (isAdhan ? `/?launch_royal_adhan=${alarm.prayerId || 'maghrib'}` : `/?launch_royal_alert=${alarm.alertType || 'dhikr_salawat'}`),
      type: alarm.type,
      prayerId: alarm.prayerId,
      alertType: alarm.alertType,
      prayerTime12: alarm.prayerTime12,
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'open_royal',
        title: isAdhan ? '🕌 فتح شاشة الأذان الملكية' : '✨ فتح التنبيه',
      },
      {
        action: 'dismiss',
        title: 'إغلاق',
      },
    ],
  };

  return self.registration.showNotification(title, options);
}

// Listen to messages from Foreground App
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SYNC_SCHEDULE' && Array.isArray(event.data.alarms)) {
    // Replace active alarms with new fresh schedule
    const now = Date.now();
    activeAlarms = event.data.alarms
      .filter((a) => a.triggerAtMs && a.triggerAtMs > now - 60000)
      .map((a) => ({ ...a, fired: false }));
    startAlarmWorker();
  }

  if (event.data.type === 'TRIGGER_NOTIFICATION') {
    const payload = event.data.payload || {};
    fireRoyalNotification(payload).catch((err) => console.warn('[SW] Manual trigger error:', err));
  }
});

// Handle notification click: Wake up / open Royal Screen instantly!
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notifData = event.notification.data || {};
  const targetUrl = notifData.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. If an existing window is open, bring it to front and send message
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'LAUNCH_ROYAL_SCREEN',
            data: notifData,
          });
          return client;
        }
      }

      // 2. If app was closed / terminated, open a new window directly with deep link
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync if available
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-prayer-alarms') {
    event.waitUntil(checkPendingAlarms());
  }
});


