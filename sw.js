const CACHE_NAME = 'consultor-v2';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/api-config.js',
    '/js/weather.js',
    '/js/catalogs.js',
    '/js/product-ui.js',
    '/js/app.js',
    '/perfumes.js',
    '/colares.js',
    '/cremes.js',
    '/perfume-admin.js',
    '/creme-admin.js',
    '/styles/base.css',
    '/styles/layout.css',
    '/styles/forms.css',
    '/styles/products.css',
    '/styles/admin.css',
    '/styles/utilities.css',
    '/assets/favicon.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
