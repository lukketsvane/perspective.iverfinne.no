/**
 * What makes the home-screen icon behave like an app.
 *
 * Saved to a phone and opened at the drawing table, the tool was still a web
 * page: no signal, no tool. This caches everything the shell needs as it is
 * first used, so the second open is served from the phone - instantly, and
 * with or without a network.
 *
 * Three rules, by what the URL can promise:
 *
 * - The page itself is asked for fresh and falls back to the copy on hand.
 *   Its whole job is to name the current build's assets, so serving it stale
 *   by preference would pin the app to the past; serving it stale as a
 *   fallback is what "works offline" means.
 *
 * - Built assets are content-hashed, so a cached one can never be wrong.
 *   Cache first, network never again.
 *
 * - Meshes keep their names across deploys, so a cached one answers now while
 *   the network quietly replaces it for next time.
 */
const CACHE = 'perspective-1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

/** Keep a copy, and keep the store from growing without bound. */
const remember = async (request, response) => {
  if (!response.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  // Old builds' hashed assets can never be asked for again; shed the store
  // oldest first. Generous enough to hold several builds and every mesh in
  // the library, small enough not to sit on a phone's storage.
  const kept = await cache.keys();
  if (kept.length > 80) await cache.delete(kept[0]);
};

/** Fetch, and file a copy before answering. */
const fetchInto = (event, request) =>
  fetch(request).then((response) => {
    event.waitUntil(remember(request, response.clone()));
    return response;
  });

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // The page: fresh when the network answers, the last one seen when not.
  if (request.mode === 'navigate') {
    event.respondWith(fetchInto(event, request).catch(() => caches.match(request)));
    return;
  }

  // Hashed assets: a hit is the truth, and is never asked about again.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(caches.match(request).then((hit) => hit ?? fetchInto(event, request)));
    return;
  }

  // Meshes and the app's own face: a hit answers now, the network quietly
  // replaces it for next time.
  const refresh =
    url.pathname.startsWith('/meshes/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/apple-touch-icon.png' ||
    url.pathname.startsWith('/icon-');
  if (!refresh) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      const fetched = fetchInto(event, request);
      if (!hit) return fetched;
      event.waitUntil(fetched.catch(() => undefined));
      return hit;
    })
  );
});
