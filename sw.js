// sw.js — Fliqr service worker
//
// Strategy:
// - Cache-first for the static app shell (HTML/CSS/JS/icons/fonts)
//   so the app opens instantly and works offline for the UI itself.
// - Network-only for anything hitting the backend (API calls,
//   socket.io) — this is a realtime chat app, cached API responses
//   would show stale messages/requests. Never cache those.
// - Cache version bumps on every deploy so users always get fresh
//   JS/CSS instead of being stuck on an old cached build.

const CACHE_VERSION = "fliqr-v1";
const BACKEND_HOST = "cipher-425d.onrender.com";

const APP_SHELL = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/api.js",
  "/js/helpers.js",
  "/js/screens/auth.js",
  "/js/screens/setup.js",
  "/js/screens/main.js",
  "/js/screens/profile.js",
  "/js/screens/search.js",
  "/js/screens/tabs.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/* ── INSTALL — pre-cache the app shell ───────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // addAll fails entirely if even one request 404s — use allSettled
      // via individual add() calls so one missing file doesn't break install
      return Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting(); // activate the new SW immediately, don't wait for old tabs to close
});

/* ── ACTIVATE — clean up old cache versions ──────────────── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // take control of any already-open tabs immediately
});

/* ── FETCH — route requests based on destination ─────────── */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept the backend — API calls and socket.io must always
  // go straight to the network. Caching these would show stale chats,
  // stale connection status, stale everything.
  if (url.hostname === BACKEND_HOST) {
    return; // let the browser handle it normally, no service worker involvement
  }

  // Never intercept socket.io polling/websocket upgrade requests from any host
  if (url.pathname.includes("/socket.io/")) {
    return;
  }

  // Only handle GET requests for caching — POST/PUT/DELETE always hit network
  if (event.request.method !== "GET") {
    return;
  }

  // Cache-first for the app shell, falling back to network,
  // and updating the cache in the background when network succeeds
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline — fall back to whatever's cached

      // Serve cached immediately if available, otherwise wait on network
      return cached || networkFetch;
    })
  );
});