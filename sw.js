/* BizTools Service Worker: offline support with versioned cache */
var CACHE = 'biztools-v3';
var CORE = [
  './',
  './index.html',
  './tools/index.html',
  './tools/estimate/index.html',
  './tools/invoice/index.html',
  './tools/profit/index.html',
  './tools/report/index.html',
  './tools/delivery/index.html',
  './tools/receipt/index.html',
  './tools/tax/index.html',
  './tools/withholding/index.html',
  './assets/css/style.css',
  './assets/js/common.js',
  './assets/js/calc.js',
  './assets/js/document.js',
  './assets/js/pdf.js',
  './assets/vendor/html2canvas.min.js',
  './assets/vendor/jspdf.umd.min.js',
  './favicon.ico',
  './assets/img/favicon-192.png',
  './site.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var isPage = e.request.mode === 'navigate';
  if (isPage) {
    // network-first for pages so updates arrive, cache as offline fallback
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); }));
    return;
  }
  // cache-first for static assets
  e.respondWith(caches.match(e.request).then(function (hit) {
    return hit || fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    });
  }));
});
