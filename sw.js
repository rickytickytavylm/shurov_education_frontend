const CACHE = "se-cabinet-v55";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=72",
  "app.js?v=75",
  "course.js?v=20",
  "config.js?v=7",
  "manifest.webmanifest",
  "apple-touch-icon.png",
  "assets/pwa-192.png",
  "assets/apple-touch-icon.png",
  "assets/hello-loop.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.destination === "video" || event.request.destination === "audio") return;
  if (event.request.headers.get("range")) return;
  if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(url.pathname)) return;

  if (url.pathname.endsWith("/manifest.webmanifest") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("index.html", copy));
          return res;
        })
        .catch(() => caches.match("index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((hit) => {
      if (hit) return hit;
      return fetch(event.request)
        .then((res) => {
          if (!res || res.status !== 200) return res;
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match(event.request));
    })
  );
});
