/* ============================================================
   Service Worker — Cotizador GONDER
   Estrategia: Cache-first para assets locales,
               Network-only para APIs externas (Odoo, BCV)
   ============================================================ */

const CACHE = 'gonder-v1';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

/* — Instalacion: pre-cachear assets esenciales — */
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

/* — Activacion: borrar caches viejos — */
self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* — Fetch: decidir cache vs red — */
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  /* APIs externas (Odoo, BCV, WhatsApp) → siempre red */
  if (url.origin !== location.origin) return;

  /* Assets locales → cache-first, fallback a red */
  evt.respondWith(
    caches.match(evt.request).then(cached => {
      if (cached) return cached;
      return fetch(evt.request).then(res => {
        /* Guardar en cache si es exitoso */
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(evt.request, clone));
        }
        return res;
      });
    }).catch(() => caches.match('./index.html'))   /* Offline: servir app */
  );
});
