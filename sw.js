const CACHE_NAME = 'v2';

const log = (...args) => console.log('[Service Worker]', ...args);

// Service worker is always installed when the page is loaded
self.addEventListener('install', event => {
  // Note: this is a good point to create cache and add files to it
  log('Installed');

  // If there is an existing service worker available, there are two ways
  // for the new service worker to not wait to be activated:
  // - A page reload
  // - Executing self.skipWaiting();
  self.skipWaiting();
});

// Service worker is activated when all clients (pages) are closed 
self.addEventListener('activate', event => {
  // Note: this is a good point to clean up old caches
  log('Activated');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      const promises = cacheNames
        .filter(name => name !== CACHE_NAME)
        .map(name => caches.delete(name));

      return Promise.all(promises);
    }).then(() => {
      // Claim all clients (pages) to be controlled by this service worker
      self.clients.claim()
    })
  );
});

self.addEventListener('fetch', event => {
  const url = event.request.url;
  log('Fetching', url);

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return cached response if available
        }

        return fetch(event.request) // Fetch from network if not cached
          .then(res => {
            // Add the new response to the cache
            const resClone = res.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, resClone));
            
            // Inspect the response content
            res.clone().text().then(content => {
              log('Content from', url, ':\n', content);
            });

            return res;
          });
      })
  );
});

let communicationPort;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PORT_INITIALIZATION') {
    communicationPort = event.ports[0];
    setTimeout(() => {
      console.log('Message from page:', event.data);
      const payload = {from: 'service worker', via: 'MessageChannel'};
      communicationPort.postMessage(payload);
    }, 100);
  } else {
    console.log('Message from page:', event.data);
    const payload = {from: 'service worker', via: 'navigator.serviceWorker'};
    event.source.postMessage(payload);
  }
});


