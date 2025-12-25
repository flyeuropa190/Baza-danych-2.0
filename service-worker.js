const CACHE_NAME = 'baza-danych-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './css/login-page.css',
  './script.js',
  './manifest.json',
  './icons/icon-192.png' 
  // Dodaj tu inne pliki, np. logo, jeśli chcesz, by działały offline
];

// Instalacja Service Workera i cache'owanie plików
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cache-owanie plików');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Aktywacja i czyszczenie starego cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('SW: Usuwanie starego cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
});

// Pobieranie zasobów (Tryb Offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});