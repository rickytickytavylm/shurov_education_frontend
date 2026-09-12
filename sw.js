const CACHE = "se-cabinet-v15";
const CORE = [
  "./",
  "index.html",
  "styles.css?v=42",
  "app.js?v=37",
  "course.js?v=10",
  "config.js?v=3",
  "manifest.webmanifest",
  "assets/hero-4k.webp",
  "assets/hero-mobile.webp",
  "assets/free-module.webp",
  "assets/free-module-mobile.webp",
  "assets/shurov.webp",
  "assets/pwa-192.png",
  "assets/pwa-512.png",
  "assets/apple-touch-icon.png",
  "assets/studio/academy-karpman.webp",
  "assets/studio/academy-cycle.webp",
  "assets/studio/academy-window.webp",
  "assets/studio/academy-boundaries.webp",
  "assets/studio/academy-differentiation.webp",
  "assets/studio/academy-care-rescue.webp",
  "assets/studio/academy-attachment.webp",
  "assets/studio/academy-family-system.webp",
  "assets/studio/academy-trauma-bond.webp",
  "assets/studio/academy-abuse-cycle.webp",
  "assets/studio/academy-distortions.webp",
  "assets/studio/academy-locus-control.webp",
  "assets/studio/academy-needs-emotions.webp",
  "assets/studio/academy-recovery.webp",
  "assets/studio/academy-tool-pause.webp",
  "assets/studio/academy-tool-whose.webp",
  "assets/studio/academy-tool-boundary-phrase.webp",
  "assets/studio/academy-tool-seven-days.webp",
  "assets/studio/academy-tool-body-sensor.webp",
  "assets/studio/academy-tool-fact-story.webp",
  "assets/studio/academy-tool-trigger-map.webp",
  "assets/studio/academy-tool-contract.webp",
  "assets/studio/academy-tool-support-network.webp",
  "assets/studio/academy-tool-safety-plan.webp",
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
