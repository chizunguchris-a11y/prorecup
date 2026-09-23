'use strict';
const CACHE = 'prorecup-terrain-shell-v1-2';
const SHELL = ['./', './index.html', './css/app.css', './js/config.js', './js/api.js', './js/auth.js', './js/offline.js', './js/app.js', './manifest.webmanifest', './icon.svg'];
const urls = new Set(SHELL.map(p => new URL(p, self.registration.scope).href));
self.addEventListener('install', event => {
    // New versions wait until all old tabs close: no mixed application versions.
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('prorecup-terrain-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const r = event.request;
    if (r.method !== 'GET' || r.headers.has('Authorization') || !urls.has(r.url)) return;
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(r)) || fetch(r)));
});
