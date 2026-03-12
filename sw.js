// Cache name uses timestamp to automatically bust on deployment
const CACHE_NAME = `soccer-coach-cache-${new Date().toISOString().split('T')[0]}`;
// List of resources to cache during installation. Add additional files as needed.
const ASSETS_TO_CACHE = [
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/core/StateInit.js',
    '/js/core/constants.js',
    '/js/shared/utils.js',
    '/js/services/StorageService.js',
    '/js/services/PlayerService.js',
    '/js/services/GameService.js',
    '/js/services/ActionService.js',
    '/js/services/StatisticsService.js',
    '/js/services/ReportService.js',
    '/js/screens/TeamSetupScreen.js',
    '/js/screens/FormationScreen.js',
    '/js/screens/GamePlayScreen.js',
    '/js/screens/ReportsScreen.js',
    '/js/screens/SettingsScreen.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('activate', event => {
    // Clean up old caches if necessary
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
        ))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request);
        })
    );
});
