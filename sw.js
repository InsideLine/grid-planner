// Lets the web copy of Grid Planner open without internet once it has been opened online.
// It always asks the network first, so a new version is picked up as soon as there is a connection;
// only when that fails (or takes more than 4 seconds) does it fall back to the copy kept here.
// publish.py puts a fingerprint of the published files in place of 5aa815fe3ab8.
const CACHE = 'grid-planner-5aa815fe3ab8';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'favicon.ico', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('grid-planner-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // a page load skips the browser's own short-term cache, so a newly published version shows straight away
      const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req);
      const res = await Promise.race([fresh, new Promise((_, no) => setTimeout(() => no(new Error('slow')), 4000))]);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' && await cache.match('./')) || Response.error();
    }
  })());
});
