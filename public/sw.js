/**
 * =============================================================================
 * Be Lyft'd — Service Worker (sw.js)
 * High Performance Offline Cache & Audio Stream Support for PWA
 * =============================================================================
 */

const CACHE_NAME = 'belyftd-pwa-v1';
const AUDIO_CACHE_NAME = 'belyftd-audio-v1';

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
  }
});
