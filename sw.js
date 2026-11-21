// Service worker de "Mis Gastos": guarda los archivos de la app para que funcione sin internet.
// IMPORTANTE: cada vez que cambies algún archivo de la app, sube el número de versión
// (por ejemplo, de v1 a v2) para que los celulares descarguen la versión nueva.
const CACHE = 'mis-gastos-v1';

const ARCHIVOS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ARCHIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((n) => n.startsWith('mis-gastos-') && n !== CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // la app no usa nada externo

  if (req.mode === 'navigate') {
    // Abrir la app siempre desde la copia guardada (funciona sin internet).
    event.respondWith(
      caches.match('./index.html').then((r) => r || fetch(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((guardado) => {
      if (guardado) return guardado;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copia = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copia));
        }
        return res;
      });
    })
  );
});
