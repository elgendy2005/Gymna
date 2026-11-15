// Gymna service worker. It does one job: when a page cannot be loaded
// because there is no connection, show the offline page instead of the
// browser's error screen.
//
// Nothing else is intercepted or stored. Pages, data and server function
// calls always go to the network, so nothing signed-in is ever cached.
// Registered in production only (see components/layout/service-worker.tsx).

const CACHE = "gymna-offline-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` skips the HTTP cache, so a new worker gets the new page.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // The offline page's own icon.
  if (request.method === "GET" && url.origin === self.location.origin && PRECACHE.includes(url.pathname) && url.pathname !== OFFLINE_URL) {
    event.respondWith(caches.match(url.pathname).then((hit) => hit ?? fetch(request)));
    return;
  }

  // Page loads only. Everything else is left to the browser.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE);
      const offline = await cache.match(OFFLINE_URL);
      return offline ?? Response.error();
    }),
  );
});
