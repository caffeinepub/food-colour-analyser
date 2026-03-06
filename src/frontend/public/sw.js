const CACHE_NAME = "food-colour-analyser-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/assets/generated/pwa-icon-192.dim_192x192.png",
  "/assets/generated/pwa-icon-512-transparent.dim_512x512.png"
];

// Install: cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for same-origin static assets, network-first for API
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and cross-origin requests (e.g. ICP canister calls)
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  // Skip /api calls — always go to network
  if (url.pathname.startsWith("/api")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Cache successful responses for static assets
          if (
            response.ok &&
            (request.destination === "script" ||
              request.destination === "style" ||
              request.destination === "image" ||
              request.destination === "font" ||
              url.pathname === "/" ||
              url.pathname === "/index.html")
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve index.html for navigation requests
          if (request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
