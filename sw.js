var CACHE='pajaros-v5';
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
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.filter(function(n){ return n!==CACHE; }).map(function(n){ return caches.delete(n); }));
    }).then(function(){
      // Notificar a todos los clientes que hay version nueva
      return self.clients.matchAll();
    }).then(function(clients){
      clients.forEach(function(c){ c.postMessage({type:'UPDATE_AVAILABLE'}); });
    })
  );
  self.clients.claim();
});

// Network-first para archivos JS/CSS (siempre intenta traer lo nuevo)
// Cache-first para assets estaticos (icons, manifest)
self.addEventListener('fetch',function(e){
  var url=e.request.url;
  if(url.match(/\.(js|css|html)(\?|$)/) || url.endsWith('/')){
    // Network first: intenta red, si falla usa cache
    e.respondWith(
      fetch(e.request).then(function(res){
        var clone=res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return res;
      }).catch(function(){ return caches.match(e.request); })
    );
  } else {
    // Cache first para el resto
    e.respondWith(
      caches.match(e.request).then(function(r){ return r || fetch(e.request); })
    );
  }
});
