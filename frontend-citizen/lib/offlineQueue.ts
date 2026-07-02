import { API_BASE } from "./api";
import type { SubmissionPayload } from "./submissions";

const DB_NAME = "pp_offline_db";
const DB_VERSION = 1;
const STORE_SUBMISSIONS = "submissions";
const STORE_CONFIG = "config";

const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const CLIENT_POLL_INTERVAL_MS = 15_000;
const SYNC_TAG = "submission-sync";

type QueuedSubmission = {
  id: string;
  payload: SubmissionPayload;
  status: "pending" | "sending";
  attempts: number;
  createdAt: number;
  nextRetryAt: number;
};

function openDb(): Promise<IDBDatabase> {
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

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function backoffDelay(attempts: number): number {
  return Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** attempts);
}

async function getAllQueued(): Promise<QueuedSubmission[]> {
  return withStore(STORE_SUBMISSIONS, "readonly", (store) => store.getAll());
}

async function removeQueued(id: string): Promise<void> {
  await withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.delete(id));
}

async function saveQueued(record: QueuedSubmission): Promise<void> {
  await withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.put(record));
}

async function postSubmission(payload: SubmissionPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : "Could not save submission";
    throw new Error(detail);
  }
}

async function sendQueuedItem(item: QueuedSubmission): Promise<boolean> {
  item.status = "sending";
  await saveQueued(item);
  try {
    await postSubmission(item.payload);
    await removeQueued(item.id);
    return true;
  } catch {
    item.status = "pending";
    item.attempts += 1;
    item.nextRetryAt = Date.now() + backoffDelay(item.attempts);
    await saveQueued(item);
    return false;
  }
}

export async function trySyncQueue(): Promise<void> {
  const items = await getAllQueued();
  const now = Date.now();
  for (const item of items) {
    if (item.status === "sending" || item.nextRetryAt > now) continue;
    await sendQueuedItem(item);
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null;

function startClientPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => void trySyncQueue(), CLIENT_POLL_INTERVAL_MS);
}

async function requestBackgroundRetry(): Promise<void> {
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // @ts-expect-error -- SyncManager isn't in the default lib.dom typings.
      await reg.sync.register(SYNC_TAG);
      return;
    } catch {
      // fall through to client-side polling
    }
  }
  startClientPolling();
}

// Registers the offline-submission service worker and kicks off a sync
// attempt for anything left over from a previous session. Call once from
// the /submit page.
export function initOfflineQueue(): void {
  if (typeof window === "undefined") return;

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        const notifyApiBase = () => {
          navigator.serviceWorker.controller?.postMessage({
            apiBase: API_BASE,
            type: "SET_API_BASE",
          });
        };
        if (reg.active) notifyApiBase();
        navigator.serviceWorker.addEventListener("controllerchange", notifyApiBase);
      })
      .catch(() => undefined);
  }

  window.addEventListener("online", () => void trySyncQueue());
  void trySyncQueue();
}

// Writes the submission to IndexedDB first, then fires a send attempt in the
// background. Resolves as soon as the local write succeeds — the caller
// (the submit form) never waits on, or sees, the network outcome. A failed
// attempt just stays queued and is retried with exponential backoff.
export async function submitOffline(payload: SubmissionPayload): Promise<void> {
  const record: QueuedSubmission = {
    id: crypto.randomUUID(),
    payload,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
    nextRetryAt: Date.now(),
  };
  await withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.put(record));

  void sendQueuedItem(record).then((sent) => {
    if (!sent) void requestBackgroundRetry();
  });
}
