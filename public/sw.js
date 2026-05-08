const CACHE = "finzzup-v3";

self.addEventListener("install", e => {
  // Pre-cache just the shell — hashed JS/CSS bundles are auto-cached on first fetch
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(["/", "/index.html"]).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Delete all old caches to force users off stale JS
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Only cache GET requests; never intercept Supabase or API calls
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.hostname.includes("supabase") || url.pathname.startsWith("/api/")) return;
  // Let fonts/CDN be network-first (they have their own max-age headers)
  if (url.hostname !== self.location.hostname) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || "Finzzup Alert", {
      body: data.body || "You have a new notification.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "finzzup",
      data: { url: data.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type:"window" }).then(list => {
      const url = e.notification.data?.url || "/";
      const existing = list.find(c => c.url === url);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
