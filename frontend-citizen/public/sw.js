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
const DB_VERSION = 2;
const STORE_SUBMISSIONS = "submissions";
const STORE_CONFIG = "config";
const STORE_DRAFTS = "drafts";

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
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
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

function clearDraft(id) {
  return withStore(STORE_DRAFTS, "readwrite", (store) => store.delete(id));
}

// Atomically checks a record is still pending and flips it to "sending" in
// one transaction — mirrors lib/offlineQueue.ts's claimQueuedItem. Needed
// because this service worker and the page each hold their own IndexedDB
// connection; without an atomic check-and-set, both could read the same
// item as "pending" and send it twice.
function claimQueuedItem(id) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_SUBMISSIONS, "readwrite");
        const store = tx.objectStore(STORE_SUBMISSIONS);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result;
          if (!item || item.status !== "pending" || item.nextRetryAt > Date.now()) {
            resolve(null);
            return;
          }
          item.status = "sending";
          const putReq = store.put(item);
          putReq.onsuccess = () => resolve(item);
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      }),
  );
}

function backoffDelay(attempts) {
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * Math.pow(2, attempts));
}

async function syncPendingSubmissions() {
  const apiBase = (await getConfig("apiBase")) || DEFAULT_API_BASE;
  const items = await getAllQueued();
  const now = Date.now();

  for (const raw of items) {
    if (raw.status !== "pending" || raw.nextRetryAt > now) continue;

    const item = await claimQueuedItem(raw.id);
    if (!item) continue; // already claimed elsewhere (e.g. an open tab)

    try {
      const res = await fetch(`${apiBase}/api/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) throw new Error("submission failed");
      await removeQueued(item.id);
      // Confirmed 200 — safe to drop the autosaved draft, even when this
      // sync ran fully in the background with no tab open.
      if (item.draftId) await clearDraft(item.draftId);
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
