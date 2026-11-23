// Ngeprint Minimal PWA Service Worker (Network-only, never intercepts /api/*)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally do not call event.respondWith(fetch(...)) for pass-through requests:
// letting the browser handle network requests natively avoids SW overhead and
// prevents transient network errors on /api/* from surfacing as net::ERR_FAILED.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
});
