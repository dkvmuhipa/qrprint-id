// Ngeprint Minimal PWA Service Worker (Network-First, no stale API/price cache)
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Pass all requests directly to the network so live queues, QRIS, and prices are never stale
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request));
});
