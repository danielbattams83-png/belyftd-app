/**
 * =============================================================================
 * Be Lyft'd — Service Worker (sw.js)
 * High Performance Offline Cache & Audio Stream Support for PWA
 * =============================================================================
 */

const CACHE_NAME = 'belyftd-pwa-v2';
const AUDIO_CACHE_NAME = 'belyftd-audio-v1';
const DAILY_DB_NAME = 'belyftd-offline';
const DAILY_DB_VERSION = 1;
const DAILY_AFFIRMATIONS_STORE = 'dailyAffirmations';
const SCHEDULER_SETTINGS_STORE = 'schedulerSettings';
const DAILY_NOTIFICATION_TAG = 'belyftd-daily-affirmation';

// Core shell assets to precache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
  '/dailyMessagingLinkHandler.js'
];

// Install Event: Precache app shell and static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Precaching app shell assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Some precache assets failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Intelligent routing strategy for Offline reliability
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests (e.g. POST, PUT)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Audio and Media requests: Cache-First strategy with fallback
  if (
    url.pathname.endsWith('.mp3') || 
    url.pathname.endsWith('.wav') || 
    url.pathname.endsWith('.ogg') || 
    url.pathname.includes('/audio/') ||
    request.destination === 'audio'
  ) {
    event.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(async (audioCache) => {
        const cachedResponse = await audioCache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            audioCache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // If offline and audio not found, synthesize a 200 OK empty audio response or header
          console.warn('[ServiceWorker] Audio offline fallback for:', request.url);
          return new Response(new Uint8Array(0), {
            status: 200,
            headers: { 'Content-Type': 'audio/mpeg' }
          });
        }
      })
    );
    return;
  }

  // 2. Navigation / HTML Document requests: Network-first falling back to cached shell (SPA support)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          console.log('[ServiceWorker] Serving cached offline SPA shell for navigation:', request.url);
          const cachedShell = await caches.match('/index.html') || await caches.match('/');
          if (cachedShell) return cachedShell;
          return new Response(
            `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Be Lyft'd - Offline</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#0F172A;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Be Lyft'd Offline</h2><p>You are currently offline. Open your saved courses and reflections when connection restores.</p></body></html>`,
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Fonts, Images): Stale-While-Revalidate
  if (
    url.origin === location.origin ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Default network fetch
  event.respondWith(fetch(request));
});

// Listen for custom messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data && event.data.type === 'SET_DAILY_NOTIFICATIONS_ENABLED') {
    event.waitUntil(writeSchedulerSetting('notificationsEnabled', Boolean(event.data.enabled)));
    return;
  }

});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === DAILY_NOTIFICATION_TAG) {
    event.waitUntil(showDailyAffirmationIfDue());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/?dailyMsg=true', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const matchingWindow = windows.find((client) => client.url.startsWith(self.location.origin));
    if (matchingWindow) {
      await matchingWindow.navigate(targetUrl);
      await matchingWindow.focus();
    } else {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

function openDailyDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DAILY_DB_NAME, DAILY_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DAILY_AFFIRMATIONS_STORE)) {
        database.createObjectStore(DAILY_AFFIRMATIONS_STORE, {keyPath: 'id'});
      }
      if (!database.objectStoreNames.contains(SCHEDULER_SETTINGS_STORE)) {
        database.createObjectStore(SCHEDULER_SETTINGS_STORE, {keyPath: 'key'});
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readSchedulerSetting(key) {
  const database = await openDailyDatabase();
  const value = await new Promise((resolve, reject) => {
    const request = database.transaction(SCHEDULER_SETTINGS_STORE, 'readonly')
      .objectStore(SCHEDULER_SETTINGS_STORE)
      .get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return value;
}

async function writeSchedulerSetting(key, value) {
  const database = await openDailyDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(SCHEDULER_SETTINGS_STORE, 'readwrite');
    transaction.objectStore(SCHEDULER_SETTINGS_STORE).put({key, value});
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
}

async function readDailyAffirmations() {
  const database = await openDailyDatabase();
  const affirmations = await new Promise((resolve, reject) => {
    const request = database.transaction(DAILY_AFFIRMATIONS_STORE, 'readonly')
      .objectStore(DAILY_AFFIRMATIONS_STORE)
      .getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  database.close();
  return affirmations;
}

async function claimDailyNotification(date) {
  const database = await openDailyDatabase();
  const claimed = await new Promise((resolve, reject) => {
    const transaction = database.transaction(SCHEDULER_SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SCHEDULER_SETTINGS_STORE);
    const request = store.get('lastNotificationDate');
    let canNotify = false;
    request.onsuccess = () => {
      if (request.result?.value !== date) {
        canNotify = true;
        store.put({key: 'lastNotificationDate', value: date});
      }
    };
    transaction.oncomplete = () => resolve(canNotify);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  database.close();
  return claimed;
}

async function showDailyAffirmationIfDue() {
  if (await readSchedulerSetting('notificationsEnabled') !== true) return;

  const now = new Date();
  if (now.getHours() < 8) return;
  const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  const affirmations = await readDailyAffirmations();
  const affirmation = affirmations.find((item) => item.date === today);
  if (!affirmation || !affirmation.text || !await claimDailyNotification(today)) return;

  await self.registration.showNotification("Your daily Be Lyft'd message", {
    body: affirmation.text,
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: `daily-affirmation-${today}`,
    data: {url: '/?dailyMsg=true'}
  });
}
