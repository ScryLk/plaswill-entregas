const CACHE = 'plaswill-driver-v3';
const ASSETS = ['./motorista.html','./motorista.js?v=5','./outbox.js?v=2','./motorista.css?v=2','./driver.webmanifest','./img/plaswill_logo.png','./img/icon-192.png','./img/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
// No skipWaiting: an update activates after existing pages close. localStorage outbox survives.
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('plaswill-driver-') && k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  const shell = new URL('./motorista.html', self.location.href);
  if (event.request.mode === 'navigate' && url.pathname === shell.pathname) {
    event.respondWith(fetch(event.request).catch(() => caches.match(shell.href))); return;
  }
  if (ASSETS.some(p => new URL(p, self.location.href).href === url.href)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
