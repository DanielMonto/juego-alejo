var CACHE='pajaros-v1';
var URLS=[
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/storage.js',
  './js/audio.js',
  './js/engine.js',
  './js/ui.js',
  './js/game.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(URLS); }));
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(names){
    return Promise.all(names.filter(function(n){ return n!==CACHE; }).map(function(n){ return caches.delete(n); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch',function(e){
  e.respondWith(
    caches.match(e.request).then(function(r){ return r || fetch(e.request); })
  );
});
