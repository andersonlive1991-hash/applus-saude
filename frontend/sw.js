const CACHE = 'applus-v9';
const ARQUIVOS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/modulos.js',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const titulo = data.titulo || 'AP+ Saúde';
  const corpo = data.corpo || '';
  const url = data.url || '/';
  const isMed = data.medicamento === true;

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [500, 200, 500, 200, 500],
      sound: isMed ? '/alarme.mp3' : undefined,
      requireInteraction: isMed,
      tag: isMed ? 'medicamento' : 'geral',
      renotify: true,
      data: { url, medicamento: isMed, corpo }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ tipo: 'alarme-push', dados: e.notification.data });
          return client.focus();
        }
      }
      return clients.openWindow(e.notification.data.url || '/');
    })
  );
});
