const CACHE = "cinebot-v2";

// App shell — files that make the UI render without network
const SHELL = [
    "/",
    "/static/app.js",
    "/static/style.css",
];

// ── Install: pre-cache the shell ──────────────────────────────────────────────
self.addEventListener("install", e => {
    e.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(SHELL))
            .then(() => self.skipWaiting())
    );
});

// ── Activate: remove old caches ───────────────────────────────────────────────
self.addEventListener("activate", e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE).map(k => caches.delete(k))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener("fetch", e => {
    const { request } = e;
    const url = new URL(request.url);

    // Never intercept cross-origin embed/streaming iframes
    if (url.origin !== location.origin) return;

    // API routes — network first, no caching (live data)
    const apiPaths = ["/recommend", "/search", "/trending", "/movie/", "/tv/",
                      "/now-playing", "/genres", "/person/", "/download", "/collection/"];
    if (apiPaths.some(p => url.pathname.startsWith(p))) {
        e.respondWith(
            fetch(request).catch(() =>
                new Response(JSON.stringify({ error: "offline" }),
                    { headers: { "Content-Type": "application/json" } })
            )
        );
        return;
    }

    // Static assets & HTML — cache first, update in background
    e.respondWith(
        caches.match(request).then(cached => {
            const network = fetch(request).then(res => {
                if (res.ok) {
                    caches.open(CACHE).then(c => c.put(request, res.clone()));
                }
                return res;
            });
            return cached || network;
        })
    );
});
