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

/** Whether a cached entry is the app's own front door. */
const isShell = (request) => new URL(request.url).pathname === '/';

/** Keep a copy, and keep the store from growing without bound. */
const remember = async (request, response) => {
  if (!response.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response);
  // Old builds' hashed assets can never be asked for again; shed the store
  // oldest first. Generous enough to hold several builds and every mesh in
  // the library, small enough not to sit on a phone's storage.
  //
  // NEVER THE SHELL, WHICH IT USED TO EAT FIRST. This shed `kept[0]`, and
  // `cache.keys()` answers in insertion order - so the oldest entry is the
  // navigation document, which is the first thing ever cached and the one
  // thing that must survive. Nineteen meshes plus a few builds of hashed
  // assets clears eighty without trying, and the reward was an app that had
  // carefully cached everything except how to start.
  //
  // And in a loop rather than one at a time: shedding a single entry per put
  // cannot catch up with a burst, so the store would sit over its limit for as
  // long as things kept arriving.
  let kept = (await cache.keys()).filter((entry) => !isShell(entry));
  while (kept.length > 80) {
    await cache.delete(kept[0]);
    kept = kept.slice(1);
  }
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

  /*
   * The page: fresh when the network answers, the last one seen when not.
   *
   * TWO FALLBACKS, NOT ONE. This ended at `caches.match(request)`, which
   * resolves UNDEFINED on a miss - and `respondWith(undefined)` is a network
   * error, which in a tab is a page you pull to reload and on a home screen is
   * a white window with no address bar, no tab bar and no back gesture. The
   * only way out of it is to force-quit the app.
   *
   * So: the exact URL, then the shell at `/`, then - only if the cache has
   * genuinely never seen this app - the network error, which at that point is
   * the truth. A navigation to a deep URL is answered by the shell because
   * this is a single-page app: the shell IS every page.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetchInto(event, request).catch(() =>
        caches.match(request).then((hit) => hit ?? caches.match('/').then((shell) => shell ?? Response.error()))
      )
    );
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
