const SHELL_CACHE = 'starlight-shell-v10';
const ASSET_CACHE = 'starlight-assets-v10';
const KEEP_CACHES = new Set([SHELL_CACHE, ASSET_CACHE]);

const CORE_SHELL_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/battle.css',
  './css/controls.css',
  './js/main.js',
  './js/config.js',
  './js/world-data.js',
  './js/pokemon.js',
  './js/storage.js',
  './js/audio.js',
  './js/input.js',
  './js/overworld.js',
  './js/battle.js',
  './js/pokedex.js',
  './js/minigame.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/fallback/pokeball.svg',
  './assets/fallback/grass.svg',
  './assets/fallback/fire.svg',
  './assets/fallback/water.svg',
  './assets/fallback/electric.svg',
  './assets/fallback/rock.svg',
  './assets/fallback/psychic.svg',
  './assets/fallback/normal.svg',
  './assets/fallback/ice.svg',
  './assets/fallback/ghost.svg',
  './assets/fallback/dragon.svg',
  './assets/fallback/fighting.svg',
  './assets/fallback/flying.svg',
  './assets/fallback/poison.svg',
  './assets/fallback/ground.svg',
  './assets/fallback/bug.svg',
  './assets/fallback/steel.svg',
  './assets/fallback/dark.svg',
  './assets/fallback/fairy.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(
        CORE_SHELL_URLS.map((url) => cache.add(url)),
      ))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !KEEP_CACHES.has(key)).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

function isAssetUrl(url, isSameOrigin) {
  if (isSameOrigin) {
    return url.pathname.includes('/assets/') || /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(url.pathname);
  }
  return (
    url.hostname === 'raw.githubusercontent.com' ||
    url.hostname.endsWith('pokeapi.co')
  );
}

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate' || request.destination === 'document') {
      const fallbackDoc = (await caches.match('./index.html')) || (await caches.match('./'));
      if (fallbackDoc) return fallbackDoc;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function cacheFirstOrSwrAsset(request, isSameOrigin, event) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = (await cache.match(request)) || (await caches.match(request));
  if (cached) {
    if (isSameOrigin) {
      event.waitUntil(
        fetch(request)
          .then((res) => {
            if (res && res.ok) {
              return cache.put(request, res.clone());
            }
            return undefined;
          })
          .catch(() => undefined),
      );
    }
    return cached;
  }

  try {
    const res = await fetch(request);
    if (res && (res.ok || res.type === 'opaque')) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  } catch {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = request.mode === 'navigate' || request.destination === 'document';

  if (isAssetUrl(url, isSameOrigin)) {
    event.respondWith(cacheFirstOrSwrAsset(request, isSameOrigin, event));
    return;
  }

  if (isNavigation || isSameOrigin) {
    event.respondWith(networkFirstShell(request));
  }
});
