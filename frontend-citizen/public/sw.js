/*
 * Offline submission queue service worker.
 *
 * Duplicates the IndexedDB read/write logic from lib/offlineQueue.ts on
 * purpose: this file runs in the service worker global scope, which Next.js
 * does not bundle, so it can't import TypeScript/app modules directly.
 */

const SHELL_CACHE = "pp-shell-v1";
const SHELL_URLS = ["/submit"];

const DB_NAME = "pp_offline_db";
const DB_VERSION = 1;
const STORE_SUBMISSIONS = "submissions";
const STORE_CONFIG = "config";

const BASE_RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
const DEFAULT_API_BASE = "http://localhost:3001";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS).catch(() => undefined)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))),
    ]),
  );
});

// Caches every same-origin asset the /submit shell actually requests — the
// document plus its JS/CSS chunks, fonts, and images — not just the HTML,
// so a fully offline reload can still hydrate the page. Assets are cached
// opportunistically on each successful online fetch, then served from cache
// when the network request fails.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isNavigation = request.mode === "navigate";
  const isStaticAsset =
    url.pathname.startsWith("/_next/") ||
    /\.(css|js|woff2?|png|jpe?g|svg|json)$/.test(url.pathname);

  if (!isNavigation && !isStaticAsset) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/submit"))),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_API_BASE") {
    event.waitUntil(setConfig("apiBase", event.data.apiBase));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "submission-sync") {
    event.waitUntil(syncPendingSubmissions());
  }
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SUBMISSIONS)) {
        db.createObjectStore(STORE_SUBMISSIONS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore(storeName, mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

function setConfig(key, value) {
  return withStore(STORE_CONFIG, "readwrite", (store) => store.put({ key, value }));
}

function getConfig(key) {
  return withStore(STORE_CONFIG, "readonly", (store) => store.get(key)).then((row) =>
    row ? row.value : undefined,
  );
}

function getAllQueued() {
  return withStore(STORE_SUBMISSIONS, "readonly", (store) => store.getAll());
}

function removeQueued(id) {
  return withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.delete(id));
}

function saveQueued(record) {
  return withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.put(record));
}

function backoffDelay(attempts) {
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * Math.pow(2, attempts));
}

async function syncPendingSubmissions() {
  const apiBase = (await getConfig("apiBase")) || DEFAULT_API_BASE;
  const items = await getAllQueued();
  const now = Date.now();

  for (const item of items) {
    if (item.status === "sending" || item.nextRetryAt > now) continue;

    item.status = "sending";
    await saveQueued(item);

    try {
      const res = await fetch(`${apiBase}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) throw new Error("submission failed");
      await removeQueued(item.id);
    } catch {
      item.status = "pending";
      item.attempts += 1;
      item.nextRetryAt = Date.now() + backoffDelay(item.attempts);
      await saveQueued(item);

      if (self.registration.sync) {
        try {
          await self.registration.sync.register("submission-sync");
        } catch {
          // No SyncManager retry available; the client-side poll fallback
          // (started from lib/offlineQueue.ts) will pick this up once a tab
          // is open again.
        }
      }
    }
  }
}
