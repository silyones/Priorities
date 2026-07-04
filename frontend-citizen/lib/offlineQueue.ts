import { API_BASE } from "./api";
import type { SubmissionPayload } from "./submissions";

const DB_NAME = "pp_offline_db";
const DB_VERSION = 4;
const STORE_SUBMISSIONS = "submissions";
const STORE_CONFIG = "config";
const STORE_DRAFTS = "drafts";

const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const CLIENT_POLL_INTERVAL_MS = 15_000;
const CONNECTIVITY_CHECK_INTERVAL_MS = 20_000;
const CONNECTIVITY_CHECK_TIMEOUT_MS = 4_000;
const SYNC_TAG = "submission-sync";
const DRAFT_ID_KEY = "citizen-draft-id";

// Fired whenever a submission is enqueued or successfully synced, so the UI
// can update a pending-count indicator immediately instead of waiting for
// the next poll tick.
const QUEUE_CHANGED_EVENT = "pp-queue-changed";

function notifyQueueChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export type DraftFields = {
  mode: "self" | "relay";
  issueTitle: string;
  assistedPerson: string;
  text: string;
  role: string;
  locality: string;
  manualArea: string;
  phoneNumber: string;
  // A citizen who can't type may have only this — must survive a crash or
  // closed tab the same as typed text does.
  audioBase64: string;
};

type DraftRecord = { id: string; fields: DraftFields; updatedAt: number };

type QueuedSubmission = {
  id: string;
  draftId: string;
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
      if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
        db.createObjectStore(STORE_DRAFTS, { keyPath: "id" });
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

// Atomically checks a record is still pending and flips it to "sending" in
// one transaction. This closes the race between the client-side poll/online
// listener and the service worker's Background Sync handler, which each run
// in a separate IndexedDB connection and would otherwise both read the same
// item as "pending" before either had a chance to claim it — sending the
// same submission twice. Returns the claimed record, or null if it was
// already claimed (by the other context) or isn't due yet.
async function claimQueuedItem(id: string): Promise<QueuedSubmission | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_SUBMISSIONS, "readwrite");
    const store = tx.objectStore(STORE_SUBMISSIONS);
    const getReq = store.get(id) as IDBRequest<QueuedSubmission | undefined>;
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
  });
}

// Every SubmissionPayload field has a matching default on the backend
// (empty string or null), so omitting empty/default values entirely — rather
// than sending them as explicit blanks — is safe and keeps the request body
// small, which matters most on the weak connections this app targets.
function minimizePayload(payload: SubmissionPayload): Partial<SubmissionPayload> {
  const trimmed: Partial<SubmissionPayload> = {};
  for (const [key, value] of Object.entries(payload) as [keyof SubmissionPayload, unknown][]) {
    if (value === "" || value === null) continue;
    (trimmed as Record<string, unknown>)[key] = value;
  }
  return trimmed;
}

async function postSubmission(payload: SubmissionPayload): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(minimizePayload(payload)),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = typeof data.detail === "string" ? data.detail : "Could not save submission";
    throw new Error(detail);
  }
}

// Assumes `item` has already been atomically claimed (status === "sending")
// via claimQueuedItem — never call this directly on an unclaimed record.
async function sendClaimedItem(item: QueuedSubmission): Promise<boolean> {
  try {
    await postSubmission(item.payload);
    await removeQueued(item.id);
    // Only clear the autosaved draft once we have a confirmed 200 — not at
    // enqueue time — so a citizen's typed text survives even if the queued
    // send itself never makes it through.
    if (item.draftId) await clearDraft(item.draftId);
    notifyQueueChanged();
    return true;
  } catch {
    item.status = "pending";
    item.attempts += 1;
    item.nextRetryAt = Date.now() + backoffDelay(item.attempts);
    await saveQueued(item);
    return false;
  }
}

// A single local UUID is reused for the lifetime of this browser/device —
// there's only ever one in-progress draft on the submit form at a time.
export function getOrCreateDraftId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DRAFT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DRAFT_ID_KEY, id);
  }
  return id;
}

export async function saveDraft(id: string, fields: DraftFields): Promise<void> {
  if (!id) return;
  const record: DraftRecord = { id, fields, updatedAt: Date.now() };
  await withStore(STORE_DRAFTS, "readwrite", (store) => store.put(record));
}

export async function loadDraft(id: string): Promise<DraftFields | undefined> {
  if (!id) return undefined;
  const record = await withStore<DraftRecord | undefined>(STORE_DRAFTS, "readonly", (store) =>
    store.get(id),
  );
  return record?.fields;
}

export async function clearDraft(id: string): Promise<void> {
  if (!id) return;
  await withStore(STORE_DRAFTS, "readwrite", (store) => store.delete(id));
}

// Lets a relay worker (who may submit many citizens' voices in one offline
// session before finding signal again) see how many are still waiting to
// sync, rather than just trusting each individual submission silently.
export async function getPendingSubmissionCount(): Promise<number> {
  const items = await getAllQueued();
  return items.length;
}

export function subscribePendingSubmissionCount(callback: (count: number) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  let cancelled = false;
  const check = () => {
    void getPendingSubmissionCount().then((count) => {
      if (!cancelled) callback(count);
    });
  };

  check();
  const timer = setInterval(check, CLIENT_POLL_INTERVAL_MS);
  window.addEventListener("online", check);
  window.addEventListener(QUEUE_CHANGED_EVENT, check);

  return () => {
    cancelled = true;
    clearInterval(timer);
    window.removeEventListener("online", check);
    window.removeEventListener(QUEUE_CHANGED_EVENT, check);
  };
}

export async function trySyncQueue(): Promise<void> {
  const items = await getAllQueued();
  const now = Date.now();
  for (const item of items) {
    if (item.status !== "pending" || item.nextRetryAt > now) continue;
    const claimed = await claimQueuedItem(item.id);
    if (!claimed) continue; // already claimed elsewhere (e.g. the service worker)
    await sendClaimedItem(claimed);
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
// draftId links this queued item back to its autosaved draft, if any, so
// the draft can be cleared once — and only once — this actually lands.
export async function submitOffline(payload: SubmissionPayload, draftId = ""): Promise<void> {
  const record: QueuedSubmission = {
    id: crypto.randomUUID(),
    draftId,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: Date.now(),
    nextRetryAt: Date.now(),
  };
  await withStore(STORE_SUBMISSIONS, "readwrite", (store) => store.put(record));
  notifyQueueChanged();

  void claimQueuedItem(record.id).then((claimed) => {
    if (!claimed) return; // a registered background sync grabbed it first
    void sendClaimedItem(claimed).then((sent) => {
      if (!sent) void requestBackgroundRetry();
    });
  });
}

// navigator.onLine only reflects whether the device has *a* network
// interface up — it reports true on a LAN with no real internet, or when
// the backend itself is down. A quick real request is the only way to know
// the backend is actually reachable.
export async function checkConnectivity(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(CONNECTIVITY_CHECK_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Reports connection status changes so the UI can show "will send once
// you're back online" messaging instead of ever disabling the submit
// button. Combines the instant online/offline browser events with a
// periodic real check, since the events alone are unreliable (see above).
export function subscribeConnectivity(callback: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;

  let cancelled = false;
  const runCheck = () => {
    void checkConnectivity().then((online) => {
      if (!cancelled) callback(online);
    });
  };
  const handleOffline = () => callback(false);

  runCheck();
  const timer = setInterval(runCheck, CONNECTIVITY_CHECK_INTERVAL_MS);
  window.addEventListener("online", runCheck);
  window.addEventListener("offline", handleOffline);

  return () => {
    cancelled = true;
    clearInterval(timer);
    window.removeEventListener("online", runCheck);
    window.removeEventListener("offline", handleOffline);
  };
}
