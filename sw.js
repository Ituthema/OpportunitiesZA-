/**
 * OpportunitiesZA — Service Worker
 * Handles offline caching, data pre-fetching, and background sync.
 *
 * Strategy per resource type:
 *   Shell (HTML/CSS/fonts) → Cache-first (serve instantly, refresh in background)
 *   Data JSON files        → Network-first (always try fresh, fall back to cache)
 *   Images / assets        → Cache-first with long TTL
 *   External (fonts CDN)   → Stale-while-revalidate
 *
 * Place this file at: /sw.js (project root)
 * Register via: navigator.serviceWorker.register('/sw.js')
 */

const APP_VERSION   = 'v1.0.0';
const SHELL_CACHE   = `oppsza-shell-${APP_VERSION}`;
const DATA_CACHE    = `oppsza-data-${APP_VERSION}`;
const ASSET_CACHE   = `oppsza-assets-${APP_VERSION}`;
const ALL_CACHES    = [SHELL_CACHE, DATA_CACHE, ASSET_CACHE];

/* ── APP SHELL — cached on install ──────────────────────────── */
const SHELL_URLS = [
  '/',
  '/index.html',
  '/404.html',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/og-default.jpg',
];

/* ── DATA FILES — network-first ─────────────────────────────── */
const DATA_URLS = [
  '/data/opportunities.json',
  '/data/guides.json',
  '/data/categories.json',
  '/data/provinces.json',
];

/* ── EXTERNAL ORIGINS — stale-while-revalidate ──────────────── */
const CDN_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

/* ── OFFLINE FALLBACK PAGE ───────────────────────────────────── */
const OFFLINE_URL = '/404.html';

/* ═══════════════════════════════════════════════════════════════
   INSTALL — cache app shell + data
═══════════════════════════════════════════════════════════════ */
self.addEventListener('install', event => {
  console.log(`[SW ${APP_VERSION}] Installing...`);

  event.waitUntil(
    Promise.all([
      // Cache the app shell
      caches.open(SHELL_CACHE).then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(SHELL_URLS).catch(err => {
          console.warn('[SW] Shell cache partial failure:', err.message);
        });
      }),

      // Pre-fetch data files
      caches.open(DATA_CACHE).then(cache => {
        console.log('[SW] Pre-fetching data files');
        return Promise.allSettled(
          DATA_URLS.map(url =>
            fetch(url)
              .then(res => res.ok ? cache.put(url, res) : null)
              .catch(() => console.warn('[SW] Data pre-fetch failed:', url))
          )
        );
      }),
    ])
    .then(() => {
      console.log(`[SW ${APP_VERSION}] Install complete`);
      // Activate immediately — don't wait for old SW to die
      return self.skipWaiting();
    })
  );
});

/* ═══════════════════════════════════════════════════════════════
   ACTIVATE — clean up old caches
═══════════════════════════════════════════════════════════════ */
self.addEventListener('activate', event => {
  console.log(`[SW ${APP_VERSION}] Activating...`);

  event.waitUntil(
    caches.keys()
      .then(keys => {
        const stale = keys.filter(key => !ALL_CACHES.includes(key));
        if (stale.length) console.log('[SW] Deleting stale caches:', stale);
        return Promise.all(stale.map(key => caches.delete(key)));
      })
      .then(() => {
        console.log(`[SW ${APP_VERSION}] Activated — claiming clients`);
        // Take control of all open tabs immediately
        return self.clients.claim();
      })
  );
});

/* ═══════════════════════════════════════════════════════════════
   FETCH — routing logic
═══════════════════════════════════════════════════════════════ */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests (POST to analytics etc.)
  if (request.method !== 'GET') return;

  // Ignore chrome-extension and other non-http schemes
  if (!url.protocol.startsWith('http')) return;

  // ── 1. Data JSON files — Network-first ──────────────────────
  if (DATA_URLS.some(d => url.pathname === d) || url.pathname.startsWith('/data/')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // ── 2. External CDN (fonts) — Stale-while-revalidate ────────
  if (CDN_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // ── 3. Images and assets — Cache-first ──────────────────────
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(png|jpg|jpeg|gif|webp|ico|svg|woff2?|ttf|otf)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // ── 4. Same-origin pages — Cache-first w/ offline fallback ──
  if (url.origin === self.location.origin) {
    event.respondWith(shellCacheFirst(request));
    return;
  }

  // ── 5. Everything else — Network only ───────────────────────
  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});

/* ═══════════════════════════════════════════════════════════════
   STRATEGIES
═══════════════════════════════════════════════════════════════ */

/**
 * Cache-first: serve from cache instantly; refresh cache in background.
 * Best for: app shell, static assets.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in background (don't await)
    refreshCache(request, cache);
    return cached;
  }
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return new Response('Offline — asset not cached.', { status: 503 });
  }
}

/**
 * Shell cache-first with SPA fallback: for all same-origin HTML navigation.
 * Any route not found in cache falls back to /index.html (SPA router takes over).
 */
async function shellCacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);

  // Try exact match first
  const cached = await cache.match(request);
  if (cached) return cached;

  // For navigation requests — fall back to index.html (SPA router)
  if (request.mode === 'navigate') {
    const indexResponse = await cache.match('/index.html') || await cache.match('/');
    if (indexResponse) return indexResponse;
  }

  // Try network
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    // Full offline fallback
    const offline = await cache.match('/index.html') || await cache.match(OFFLINE_URL);
    return offline || new Response(
      '<h1>You are offline</h1><p>OpportunitiesZA needs internet for first load. Please reconnect and try again.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

/**
 * Network-first: always try fresh from network; fall back to cache if offline.
 * Best for: data JSON files that change frequently.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const fresh = await fetch(request);
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Serving stale data (offline):', request.url);
      return cached;
    }
    return new Response(JSON.stringify({ error: 'offline', data: [] }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Stale-while-revalidate: serve cached immediately; update cache in background.
 * Best for: fonts and external CDN resources.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always kick off a network request in background
  const fetchPromise = fetch(request).then(fresh => {
    if (fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  }).catch(() => null);

  return cached || fetchPromise;
}

/**
 * Background cache refresh — fire-and-forget.
 */
async function refreshCache(request, cache) {
  try {
    const fresh = await fetch(request);
    if (fresh.ok) await cache.put(request, fresh);
  } catch {
    // Silently fail — no harm, cached version still served
  }
}

/* ═══════════════════════════════════════════════════════════════
   BACKGROUND SYNC — retry failed opportunity saves
═══════════════════════════════════════════════════════════════ */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-saved-opportunities') {
    event.waitUntil(syncSavedOpportunities());
  }
});

async function syncSavedOpportunities() {
  // Placeholder: when background sync is supported, retry any
  // pending actions (e.g. newsletter sign-up that failed offline).
  console.log('[SW] Background sync: saved opportunities');
}

/* ═══════════════════════════════════════════════════════════════
   PUSH NOTIFICATIONS — future WhatsApp-style alerts
═══════════════════════════════════════════════════════════════ */
self.addEventListener('push', event => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'OpportunitiesZA', body: event.data.text() }; }

  const options = {
    body:    data.body  || 'New opportunity posted — tap to view',
    icon:    data.icon  || '/assets/icons/icon-192x192.png',
    badge:   data.badge || '/assets/icons/icon-96x96.png',
    image:   data.image || null,
    tag:     data.tag   || 'oppsza-notification',
    data:    { url: data.url || '/' },
    actions: [
      { action: 'view',   title: 'View Now' },
      { action: 'close',  title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'OpportunitiesZA 🇿🇦', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus an existing tab if one is open
      const existing = windowClients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
        return;
      }
      // Otherwise open a new tab
      return clients.openWindow(targetUrl);
    })
  );
});

/* ═══════════════════════════════════════════════════════════════
   MESSAGE CHANNEL — communicate with app
═══════════════════════════════════════════════════════════════ */
self.addEventListener('message', event => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0]?.postMessage({ version: APP_VERSION });
      break;

    case 'CLEAR_DATA_CACHE':
      caches.delete(DATA_CACHE).then(() => {
        event.ports[0]?.postMessage({ cleared: true });
      });
      break;

    default:
      console.log('[SW] Unknown message:', event.data.type);
  }
});

/* ═══════════════════════════════════════════════════════════════
   HOW TO REGISTER — paste into index.html before </body>
   ───────────────────────────────────────────────────────────────

   <script>
     if ('serviceWorker' in navigator) {
       window.addEventListener('load', () => {
         navigator.serviceWorker.register('/sw.js')
           .then(reg => {
             console.log('SW registered:', reg.scope);

             // Prompt user to update when new SW is waiting
             reg.addEventListener('updatefound', () => {
               const newWorker = reg.installing;
               newWorker.addEventListener('statechange', () => {
                 if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                   // New content available — show an update banner
                   if (confirm('OpportunitiesZA has been updated! Reload for the latest listings?')) {
                     newWorker.postMessage({ type: 'SKIP_WAITING' });
                     window.location.reload();
                   }
                 }
               });
             });
           })
           .catch(err => console.warn('SW registration failed:', err));

         // Reload page when new SW takes control
         let refreshing = false;
         navigator.serviceWorker.addEventListener('controllerchange', () => {
           if (!refreshing) { refreshing = true; window.location.reload(); }
         });
       });
     }
   </script>

═══════════════════════════════════════════════════════════════ */
