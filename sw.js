/* Атлас упражнений: работа без интернета. Версия меняется с каждой сборкой — старое сохранённое удаляется. */
const VERSION = "atlas-0dfd660c6b";
const CORE = ["./", "card.html", "atlas.css?v=3bf4838c21", "atlas.js?v=7aaa3fca57", "data.js?v=5d96b3552a", "manifest.webmanifest", "assets/apple-touch-icon.png", "assets/emblem.png", "assets/favicon.png", "assets/icon-192.png", "assets/icon-512.png"];
const SCOPE = new URL("./", self.registration.scope);
const abs = p => new URL(p, SCOPE).href;
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(abs))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("atlas-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
const keep = (req, res) => { if (res && (res.ok || res.type === "opaque")) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(req, cp)); } return res; };
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const host = new URL(req.url).hostname;   // чужие адреса (обсуждение, Turnstile) — мимо сохранённого, кроме шрифтов
  if (new URL(req.url).origin !== self.location.origin && !/^fonts\.(googleapis|gstatic)\.com$/.test(host)) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then(res => keep(req, res)).catch(async () => {
      const c = await caches.open(VERSION);
      const rel = new URL(req.url).pathname.slice(SCOPE.pathname.length).replace(/index\.html$/, "");
      return (await c.match(req, { ignoreSearch: true })) || (await c.match(abs(rel ? "card.html" : "./")));
    }));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => keep(req, res))));
});
