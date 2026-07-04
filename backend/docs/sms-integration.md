# SMS integration guide

This document describes how subscriber phone numbers are stored, how to fetch them, and where SMS is sent when an MP updates issue status. It is **provider-agnostic** — the reference implementation uses Twilio; a Fast2SMS adapter would plug in at the same call site.

---

## Firestore layout

### Issue document

Collection: `issues/{issueId}`

| Field | Type | Notes |
|-------|------|--------|
| `status` | string | `"Open"`, `"Work in Progress"`, or `"Completed"` |
| `lastNotifiedStatus` | string \| null | Last status for which SMS was attempted; prevents duplicate sends |
| `subscriberCount` | number | Denormalized count of unique phones |
| `submissionIds` | string[] | Linked citizen submission doc IDs |
| `repSubmissionId` | string | Representative submission for display / AI brief |

### Subscriber subcollection

Path: **`issues/{issueId}/subscribers/{phoneNumber}`**

- **Document ID** = normalized 10-digit phone (dedupes repeat reports from the same person).
- **Fields:**
  - `phoneNumber` (string) — same as doc ID
  - `firstReportedAt` (timestamp) — server timestamp when first subscribed

Citizen `phoneNumber` on `submissions/{id}` is **not** exposed via public list APIs. Phones are only readable through the MP-guarded subscriber endpoint or Admin SDK server-side.

---

## Fetching subscriber numbers (Admin SDK)

The TypeScript bridge uses Firebase Admin (`backend/src/issue_queries.ts`):

```typescript
import { getFirestoreDb } from "./firebase";

export async function listIssueSubscribers(issueId: string) {
  const db = getFirestoreDb();
  const snap = await db
    .collection("issues")
    .doc(issueId)
    .collection("subscribers")
    .orderBy("firstReportedAt", "desc")
    .get();

  return snap.docs.map((docSnap) => ({
    phoneNumber: docSnap.data().phoneNumber ?? docSnap.id,
    firstReportedAt: docSnap.data().firstReportedAt?.toDate?.()?.toISOString() ?? null,
  }));
}
```

Python callers use `firestore_service.list_issue_subscribers(issue_id)` or `issue_service.subscribers_for_notification(issue_id)` (returns plain phone strings).

---

## REST API (MP-only)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/issues/{issue_id}/subscribers` | **Required** | List phones for MP dashboard expand |
| `PATCH /api/issues/{issue_id}/status` | **Required** | Update status + trigger SMS |

### MP authentication

There is **no session/login system** in this app. FastAPI MP-gated routes require a shared secret header:

```
X-MP-API-Key: <MP_API_SECRET>
```

**Browser → Next.js → FastAPI (server-side proxy)**

The MP frontend never sends the secret from the browser. Client code calls same-origin Next.js routes:

| Browser calls | Next.js route handler | Proxies to FastAPI |
|---------------|----------------------|-------------------|
| `GET /api/issues/{id}/subscribers` | `app/api/issues/[id]/subscribers/route.ts` | `GET {BACKEND_URL}/api/issues/{id}/subscribers` |
| `PATCH /api/issues/{id}/status` | `app/api/issues/[id]/status/route.ts` | `PATCH {BACKEND_URL}/api/issues/{id}/status` |

Each route handler runs **server-side only**, reads `MP_API_SECRET` from `process.env` (no `NEXT_PUBLIC_` prefix), attaches `X-MP-API-Key`, and forwards to FastAPI.

**Environment (Next.js server — `frontend/.env.local`):**

```
BACKEND_URL=http://127.0.0.1:3001
MP_API_SECRET=<same value as backend/.env MP_API_SECRET>
```

**Environment (FastAPI — `backend/.env`):**

```
MP_API_SECRET=<same value>
```

`MP_API_SECRET` must **not** appear in any `NEXT_PUBLIC_*` variable or client bundle.

If `MP_API_SECRET` is unset on either server, protected endpoints return **503**.

Unauthenticated FastAPI requests (no valid header) return **401**.

For production hardening beyond this shared secret, add Firebase Auth custom claims or OAuth in front of the Next.js routes.

---

## Where SMS is triggered

**File:** `backend/main.py` → `PATCH /api/issues/{issue_id}/status`

Flow:

1. Verify `X-MP-API-Key` (`require_mp_api_key`).
2. Persist new `status` on the issue doc immediately (response is not blocked on SMS).
3. If new status is **`Work in Progress`** or **`Completed`** **and** `new_status != lastNotifiedStatus`:
   - Queue `_notify_issue_status_subscribers` via FastAPI **`BackgroundTasks`**.
4. Background task (`main.py`):
   - Load phones via `subscribers_for_notification(issue_id)`
   - Call `notify_issue_subscribers(...)` in `twilio_service.py`
   - Set `lastNotifiedStatus` to the new status on the issue doc

### What `lastNotifiedStatus` does

- Stores the last status value that triggered an SMS pass.
- Example: `Open` → `Work in Progress` sends SMS and sets `lastNotifiedStatus = "Work in Progress"`.
- Setting `Work in Progress` again does **not** re-send.
- `Work in Progress` → `Completed` sends again because `Completed != lastNotifiedStatus`.

Status updates always persist even if SMS is skipped (no Twilio creds, no subscribers, or send failures).

---

## Provider reference: Twilio

**Module:** `backend/twilio_service.py`

```python
def send_sms(*, to: str, body: str) -> None:
    """Send one SMS via Twilio REST API."""

def notify_issue_subscribers(
    *,
    issue_id: str,
    status: str,
    topic: str,
    phone_numbers: list[str],
) -> None:
    """Build message + send to each number; skips gracefully if Twilio unset."""
```

### Environment variables (Twilio)

| Variable | Required | Notes |
|----------|----------|--------|
| `TWILIO_ACCOUNT_SID` | For SMS | |
| `TWILIO_AUTH_TOKEN` | For SMS | |
| `TWILIO_FROM_NUMBER` | For SMS | E.164 sender |

### Graceful skip

If any Twilio var is missing, `notify_issue_subscribers` logs a warning and returns without raising. The PATCH endpoint still returns success; `lastNotifiedStatus` is still updated in the background task after the notify call (even when skipped).

---

## Fast2SMS equivalent (sketch)

Add `backend/fast2sms_service.py` with the same outward shape:

```python
def send_sms(*, to: str, body: str) -> None:
    """POST to Fast2SMS bulk API with FAST2SMS_API_KEY."""

def notify_issue_subscribers(
    *,
    issue_id: str,
    status: str,
    topic: str,
    phone_numbers: list[str],
) -> None:
    if not _fast2sms_configured():
        logger.warning("Fast2SMS not configured; skipping %d SMS", len(phone_numbers))
        return
    message = build_status_message(issue_id=issue_id, status=status, topic=topic)
    for phone in phone_numbers:
        send_sms(to=phone, body=message)
```

Suggested env vars:

```
FAST2SMS_API_KEY=
FAST2SMS_SENDER_ID=  # if required by your route
SMS_PROVIDER=twilio   # or fast2sms — wire in main.py / a small factory
```

Swap the import in `main.py` `_notify_issue_status_subscribers` from `twilio_service` to your adapter; keep `build_status_message` / phone formatting shared.

---

## Firestore security rules

Rules deny all client reads/writes on `submissions`, `issues`, and `issues/*/subscribers`. Only the backend Admin SDK bypasses rules.

Deploy after changes:

```bash
firebase deploy --only firestore:rules
```

---

## Local setup checklist

1. `FIREBASE_SERVICE_ACCOUNT_PATH` in `backend/.env`
2. `MP_API_SECRET` in **both** `backend/.env` and `frontend/.env.local` (Next.js server proxy — not `NEXT_PUBLIC_*`)
3. `BACKEND_URL` in `frontend/.env.local` for the proxy to reach FastAPI
4. Optional Twilio vars for live SMS
5. Restart dev server after env changes
6. Run migration once: `python backend/scripts/migrate_issues.py`
