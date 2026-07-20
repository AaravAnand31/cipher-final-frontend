// sw.js — Fliqr service worker
//
// Strategy change (deliberate):
// The previous version was cache-first for the app shell. That made deploys
// unreliable — a stale HTML/CSS/JS snapshot could survive a deploy and there
// was no clean way to tell whether what you were looking at was current.
//
// This version is NETWORK-FIRST for the app shell. The network copy always
// wins when it's reachable, so a deploy lands immediately. The cache is kept
// purely as an offline fallback. Backend traffic is never intercepted.
//
// Bump CACHE_VERSION on any deploy where you want old caches dropped.

const CACHE_VERSION = "fliqr-v3";
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
  "/js/screens/events.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

/* ── INSTALL — warm the offline fallback cache ───────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      // Individual add() calls so one missing file can't fail the whole install
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url).catch(() => {})))
    )
  );
  self.skipWaiting();
});

/* ── ACTIVATE — drop every cache that isn't the current one ── */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ───────────────────────────────────────────────── */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never touch the backend. API calls and socket.io must always hit the
  // network — cached chat or connection data would be actively wrong.
  if (url.hostname === BACKEND_HOST) return;
  if (url.pathname.includes("/socket.io/")) return;

  // Only GETs are cacheable.
  if (event.request.method !== "GET") return;

  // Cross-origin (fonts, CDNs) — let the browser handle it normally.
  if (url.origin !== self.location.origin) return;

  // Network-first: always prefer fresh, fall back to cache only when offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        // Offline on a navigation with nothing cached — serve the shell.
        if (event.request.mode === "navigate") {
          const shell = await caches.match("/index.html");
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});

/* Lets the page trigger an immediate update via
   registration.waiting.postMessage({type:'SKIP_WAITING'}) */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});