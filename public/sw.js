const SHELL_CACHE = 'radio-shell-v3';
const STATIC_CACHE = 'radio-static-v3';
const OFFLINE_CACHE = 'radio-offline-media-v1';
const OFFLINE_PAGE = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll([OFFLINE_PAGE, '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const allowed = new Set([SHELL_CACHE, STATIC_CACHE, OFFLINE_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('radio-') && !allowed.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function serveOfflineMedia(request) {
  const url = new URL(request.url);
  const cache = await caches.open(OFFLINE_CACHE);
  const cached = await cache.match(url.origin + url.pathname);
  if (!cached) return new Response('Not found', { status: 404 });

  const range = request.headers.get('range');
  if (!range) return cached;

  const buffer = await cached.arrayBuffer();
  const bytes = buffer.byteLength;
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  if (!match) return cached;

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : bytes - 1;
  const end = Math.min(requestedEnd, bytes - 1);
  if (start >= bytes || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${bytes}` } });
  }

  const chunk = buffer.slice(start, end + 1);
  const headers = new Headers(cached.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${bytes}`);
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Length', String(chunk.byteLength));
  return new Response(chunk, { status: 206, statusText: 'Partial Content', headers });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith('/offline-media/')) {
    event.respondWith(serveOfflineMedia(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match(OFFLINE_PAGE)) || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
