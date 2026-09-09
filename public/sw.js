/*
 * RosiFit service worker.
 *
 * It exists for ONE reason: Chromium will not offer to install a site until a
 * service worker with a fetch handler can answer the start URL offline. It is
 * not a data cache and must never become one.
 *
 * THE RULE THAT MATTERS (guardrail 1, CP-001). The member list has exactly one
 * source. A cached API response is a second copy of it, and a second copy is
 * precisely how the dashboard count and the weekly list drift apart. So:
 *
 *   - only same-origin GETs are ever touched. Supabase is a different origin,
 *     so every read, write and Edge Function call passes straight through to
 *     the network, uncached, unread, unmodified;
 *   - a POST, PUT, PATCH or DELETE is never handled here at all;
 *   - the only things stored are the app shell (the HTML documents) and the
 *     content-hashed build output under /_expo/static/.
 *
 * Offline, the app opens and its screens render their existing error state
 * (CP-002 / CP-003) — "we could not reach the server, nothing was changed".
 * It does NOT show yesterday's attendance as though it were today's.
 *
 * UPDATE POLICY. No skipWaiting, deliberately: nothing here ever swaps the JS
 * bundle underneath somebody half way through marking a register.
 *
 * That used to mean a new deployment took effect ONLY on the next launch —
 * and the installed app is a tab that is never closed, so a session could run
 * a build for days after it was replaced. It no longer does:
 * `src/pwa/DeploymentRefresh.tsx` watches the start URL for a newer bundle and
 * reloads the page, in the background or after an unbroken minute of no touch.
 * The promise above is unchanged — that reload is what puts the new build on
 * screen, at a moment when it costs nobody anything, and this worker still
 * activates the way it always has.
 */

/*
 * Bump when the caching STRATEGY below changes. It does not need bumping for an
 * ordinary deployment: documents are network-first, so they refresh themselves,
 * and build output is content-hashed, so a new build simply asks for URLs that
 * are not in the cache yet.
 */
const VERSION = 'v1';
const CACHE = `rosifit-shell-${VERSION}`;

/* The offline fallback. Also the start_url, which is what Chromium probes. */
const SHELL = '/';

/*
 * ROLLBACK. A service worker outlives the deployment that installed it, so
 * deleting these files from the server does not remove it from a browser that
 * already has it. To retire it, flip this to true and deploy: the worker then
 * clears its caches and unregisters itself on the next page load.
 */
const KILL_SWITCH = false;

self.addEventListener('install', (event) => {
  if (KILL_SWITCH) return;
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(SHELL)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      if (KILL_SWITCH) {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
        await self.registration.unregister();
        return;
      }
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('rosifit-shell-') && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Content-hashed build output: the only thing safe to serve cache-first. */
function isImmutableBuildOutput(url) {
  return url.pathname.startsWith('/_expo/static/');
}

/** The static files this change added, plus the favicon. Small, and rarely changed. */
function isAppIcon(url) {
  return (
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/favicon.ico' ||
    /^\/icon-[\w-]+\.png$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  if (KILL_SWITCH) return;

  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase and every other host

  if (request.mode === 'navigate') {
    /*
     * Network-first. A deployment must be visible on the next launch, and a
     * screen must never be served from yesterday when the network is fine.
     */
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = (await caches.match(request)) ?? (await caches.match(SHELL));
          if (cached) return cached;
          throw new Error('offline and no cached shell');
        }
      })(),
    );
    return;
  }

  if (isImmutableBuildOutput(url) || isAppIcon(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })(),
    );
  }

  /* Anything else same-origin falls through to the network untouched. */
});
