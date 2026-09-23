'use strict';
const CACHE = 'prorecup-terrain-shell-v1-4';
const SHELL = ['./', './index.html', './css/app.css?v=1-4', './js/config.js?v=1-4', './js/api.js?v=1-4', './js/auth.js?v=1-4', './js/offline.js?v=1-4', './js/app.js?v=1-4', './manifest.webmanifest', './icon.svg'];
const urls = new Set(SHELL.map(p => new URL(p, self.registration.scope).href));
self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('prorecup-terrain-shell-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
    const r = event.request;
    if (r.method !== 'GET' || r.headers.has('Authorization') || !urls.has(r.url)) return;
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(r)) || fetch(r)));
});
