// v3 - modo offline
const CACHE = 'applus-v22';
const ARQUIVOS = [
  '/', '/index.html', '/css/style.css',
  '/js/modulos.js', '/manifest.json', '/offline.html',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/sounds/alarme.wav'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS).catch(() => {})));
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
  const url = e.request.url;

  // APIs — tenta online primeiro, se falhar usa cache
  if (url.includes('/api/')) {
    e.respondWith(
      fetch(e.request.clone())
        .then(res => {
          // Salva resposta GET no cache
          if (e.request.method === 'GET' && res.ok) {
            const resClone = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, resClone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Arquivos estáticos — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(res => {
        const resClone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, resClone));
        return res;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('/offline.html');
      });
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  const titulo = data.titulo || 'AP+ Saúde';
  const corpo = data.corpo || '';
  const isMed = data.medicamento === true;
  const isEvento = data.alarme === true;

  if (isMed || isEvento) {
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      console.log('[SW] Clientes ativos:', lista.length, 'isMed:', isMed, 'isEvento:', isEvento);
      lista.forEach(c => {
        c.postMessage({ tipo: 'tocar-alarme' });
        c.postMessage({ tipo: 'alarme-push', dados: {
          medicamento: isMed,
          alarme: isEvento,
          eventoNome: data.eventoNome || '',
          corpo, titulo,
          medId: data.medId,
          medNome: data.medNome,
          url: data.url || '/'
        }});
      });
    });
  }

  e.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [800, 300, 800, 300, 800, 300, 800],
      requireInteraction: true,
      tag: isMed ? 'medicamento' : 'geral',
      renotify: true,
      silent: false,
      data: { url: data.url || '/', medicamento: isMed, corpo, titulo, medId: data.medId, medNome: data.medNome }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    lista.forEach(c => c.postMessage({ tipo: 'parar-alarme' }));
  });
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const client of lista) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({ tipo: 'alarme-push', dados: e.notification.data });
          return client.focus();
        }
      }
      return clients.openWindow('https://applus-saude-production.up.railway.app/');
    })
  );
});

// ── Firebase Cloud Messaging ──
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCei4pon-zvFXKYEVBhPC_CqV-PAR1mijo",
  authDomain: "applus-91d09.firebaseapp.com",
  projectId: "applus-91d09",
  storageBucket: "applus-91d09.firebasestorage.app",
  messagingSenderId: "814206937925",
  appId: "1:814206937925:web:9b550986b5e06678532c2c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const titulo = payload.notification?.title || payload.data?.titulo || 'AP+ Saúde';
  const corpo = payload.notification?.body || payload.data?.corpo || '';
  const url = payload.data?.url || '/';
  self.registration.showNotification(titulo, {
    body: corpo,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [800, 300, 800],
    data: { url }
  });
});
