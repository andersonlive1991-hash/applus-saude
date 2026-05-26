// SW Cuidador v1
const CACHE = 'cuidador-v1';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { self.clients.claim(); });

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const titulo = data.titulo || 'AP+ Saúde — Cuidador';
  const corpo = data.corpo || '';

  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    lista.forEach(c => {
      c.postMessage({ tipo: 'push-cuidador', dados: { titulo, corpo, url: data.url || '/cuidador.html' } });
    });
  });

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      vibrate: [800, 300, 800, 300, 800],
      requireInteraction: true,
      tag: 'cuidador-evento',
      renotify: true,
      data: { url: data.url || '/cuidador.html' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const client of lista) {
        if (client.url.includes('cuidador.html') && 'focus' in client) return client.focus();
      }
      return clients.openWindow('https://applus-saude-production.up.railway.app/cuidador.html');
    })
  );
});
