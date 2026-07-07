"""Firestore over HTTPS (REST) — avoids gRPC hangs in Railway containers."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any

import httpx
from google.auth.transport.requests import Request
from google.oauth2 import service_account

from firebase_bootstrap import get_project_id, get_service_account_info

_SCOPES = ("https://www.googleapis.com/auth/datastore",)
_TIMEOUT = float(os.getenv("FIRESTORE_REST_TIMEOUT_SEC", "30"))

_creds: service_account.Credentials | None = None
_http: httpx.Client | None = None


def _api_root() -> str:
    return (
        f"https://firestore.googleapis.com/v1/projects/{get_project_id()}"
        "/databases/(default)/documents"
    )


def _http_client() -> httpx.Client:
    global _http
    if _http is None:
        _http = httpx.Client(timeout=_TIMEOUT)
    return _http


def _auth_headers() -> dict[str, str]:
    global _creds
    if _creds is None:
        _creds = service_account.Credentials.from_service_account_info(
            get_service_account_info(),
            scopes=_SCOPES,
        )
    if not _creds.valid:
        _creds.refresh(Request())
    token = _creds.token
    if not token:
        raise RuntimeError("Failed to obtain Firestore access token.")
    return {"Authorization": f"Bearer {token}"}


def _request(method: str, url: str, **kwargs: Any) -> dict[str, Any]:
    headers = {**_auth_headers(), **kwargs.pop("headers", {})}
    response = _http_client().request(method, url, headers=headers, **kwargs)
    if response.status_code >= 400:
        detail = response.text[:500]
        raise RuntimeError(
            f"Firestore REST {method} {url} failed ({response.status_code}): {detail}"
        )
    if not response.content:
        return {}
    return response.json()


def _decode_value(value: dict[str, Any]) -> Any:
    if "stringValue" in value:
        return value["stringValue"]
    if "integerValue" in value:
        return int(value["integerValue"])
    if "doubleValue" in value:
        return float(value["doubleValue"])
    if "booleanValue" in value:
        return value["booleanValue"]
    if "timestampValue" in value:
        return value["timestampValue"]
    if "nullValue" in value:
        return None
    if "geoPointValue" in value:
        gp = value["geoPointValue"]
        return {
            "latitude": gp.get("latitude"),
            "longitude": gp.get("longitude"),
        }
    if "arrayValue" in value:
        values = value["arrayValue"].get("values", [])
        return [_decode_value(item) for item in values]
    if "mapValue" in value:
        fields = value["mapValue"].get("fields", {})
        return {key: _decode_value(item) for key, item in fields.items()}
    return None


def _encode_value(value: Any) -> dict[str, Any]:
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, int):
        return {"integerValue": str(value)}
    if isinstance(value, float):
        return {"doubleValue": value}
    if isinstance(value, str):
        return {"stringValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [_encode_value(item) for item in value]}}
    if isinstance(value, dict):
        return {
            "mapValue": {
                "fields": {key: _encode_value(item) for key, item in value.items()},
            },
        }
    return {"stringValue": str(value)}


def _doc_id(name: str) -> str:
    return name.rsplit("/", 1)[-1]


def _decode_fields(fields: dict[str, Any]) -> dict[str, Any]:
    return {key: _decode_value(value) for key, value in fields.items()}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _list_documents(
    collection: str,
    *,
    order_by: str | None = None,
    field_paths: list[str] | None = None,
) -> list[tuple[str, dict[str, Any]]]:
    params: list[tuple[str, str]] = [("pageSize", "300")]
    if order_by:
        params.append(("orderBy", order_by))
    if field_paths:
        for path in field_paths:
            params.append(("mask.fieldPaths", path))

    items: list[tuple[str, dict[str, Any]]] = []
    page_token: str | None = None

    while True:
        page_params = list(params)
        if page_token:
            page_params.append(("pageToken", page_token))

        data = _request("GET", f"{_api_root()}/{collection}", params=page_params)
        for doc in data.get("documents", []):
            fields = doc.get("fields", {})
            items.append((_doc_id(doc["name"]), _decode_fields(fields)))

        page_token = data.get("nextPageToken")
        if not page_token:
            break

    return items


def _get_document(collection: str, doc_id: str) -> dict[str, Any] | None:
    try:
        doc = _request("GET", f"{_api_root()}/{collection}/{doc_id}")
    except RuntimeError as exc:
        if "404" in str(exc):
            return None
        raise
    return _decode_fields(doc.get("fields", {}))


def _create_document(collection: str, fields: dict[str, Any]) -> str:
    encoded = {key: _encode_value(value) for key, value in fields.items()}
    doc = _request(
        "POST",
        f"{_api_root()}/{collection}",
        json={"fields": encoded},
    )
    return _doc_id(doc["name"])


def _patch_document(
    collection: str,
    doc_id: str,
    fields: dict[str, Any],
) -> None:
    encoded = {key: _encode_value(value) for key, value in fields.items()}
    mask = [("updateMask.fieldPaths", key) for key in fields]
    _request(
        "PATCH",
        f"{_api_root()}/{collection}/{doc_id}",
        params=mask,
        json={"fields": encoded},
    )


def _run_query(collection: str, field: str, op: str, value: Any) -> list[tuple[str, dict[str, Any]]]:
    body = {
        "structuredQuery": {
            "from": [{"collectionId": collection}],
            "where": {
                "fieldFilter": {
                    "field": {"fieldPath": field},
                    "op": op,
                    "value": _encode_value(value),
                },
            },
        },
    }
    rows = _request("POST", f"{_api_root()}:runQuery", json=body)
    items: list[tuple[str, dict[str, Any]]] = []
    for row in rows:
        doc = row.get("document")
        if not doc:
            continue
        items.append((_doc_id(doc["name"]), _decode_fields(doc.get("fields", {}))))
    return items


def _map_submission(
    doc_id: str,
    data: dict[str, Any],
    *,
    include_phone: bool,
) -> dict[str, Any]:
    has_image = data.get("hasImage") is True
    phone_raw = data.get("phoneNumber")
    mapped: dict[str, Any] = {
        "id": doc_id,
        "topic": data.get("topic") or "",
        "description": data.get("description") or "",
        "issueType": data.get("issueType") or "",
        "severity": data.get("severity") or "",
        "locality": data.get("locality") or "",
        "submittedFor": data.get("submittedFor") or "",
        "name": data.get("name") or "",
        "role": data.get("role") or "",
        "aiTags": data.get("aiTags") if isinstance(data.get("aiTags"), list) else [],
        "latitude": data.get("latitude") if isinstance(data.get("latitude"), (int, float)) else None,
        "longitude": data.get("longitude") if isinstance(data.get("longitude"), (int, float)) else None,
        "hasImage": has_image,
        "createdAt": data.get("createdAt"),
    }
    if include_phone:
        mapped["phoneNumber"] = (
            phone_raw.strip()
            if isinstance(phone_raw, str) and phone_raw.strip()
            else None
        )
    return mapped


_SUBMISSION_FIELDS = [
    "topic",
    "description",
    "issueType",
    "severity",
    "locality",
    "submittedFor",
    "name",
    "role",
    "aiTags",
    "latitude",
    "longitude",
    "hasImage",
    "phoneNumber",
    "createdAt",
]


def _parse_issue_location(data: dict[str, Any]) -> dict[str, float] | None:
    loc = data.get("location")
    if not isinstance(loc, dict):
        return None

    if "latitude" in loc and "longitude" in loc:
        lat, lng = loc.get("latitude"), loc.get("longitude")
        if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
            return {"lat": float(lat), "lng": float(lng)}

    lat = loc.get("lat", loc.get("latitude"))
    lng = loc.get("lng", loc.get("longitude"))
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        return {"lat": float(lat), "lng": float(lng)}
    return None


def _map_issue(doc_id: str, data: dict[str, Any]) -> dict[str, Any]:
    ai_title = data.get("aiTitle")
    submission_ids = data.get("submissionIds")
    return {
        "id": doc_id,
        "issueType": data.get("issueType") or "",
        "repTopic": data.get("repTopic") or "",
        "repDescription": data.get("repDescription") or "",
        "repLocality": data.get("repLocality") or "",
        "repSubmissionId": data.get("repSubmissionId") or "",
        "aiTitle": ai_title.strip() if isinstance(ai_title, str) and ai_title.strip() else None,
        "status": data.get("status") or "Open",
        "submissionIds": [str(item) for item in submission_ids] if isinstance(submission_ids, list) else [],
        "subscriberCount": data.get("subscriberCount") if isinstance(data.get("subscriberCount"), int) else 0,
        "lastNotifiedStatus": data.get("lastNotifiedStatus")
        if isinstance(data.get("lastNotifiedStatus"), str)
        else None,
        "createdAt": data.get("createdAt"),
        "completedAt": data.get("completedAt"),
        "outcome": data.get("outcome").strip()
        if isinstance(data.get("outcome"), str) and data.get("outcome").strip()
        else None,
        "location": _parse_issue_location(data),
    }


def save_submission(payload: dict[str, Any]) -> dict[str, str]:
    image_base64 = payload.get("imageBase64")
    has_image = isinstance(image_base64, str) and bool(image_base64.strip())
    fields = {
        **payload,
        "hasImage": has_image,
        "createdAt": _now_iso(),
    }
    doc_id = _create_document("submissions", fields)
    return {"id": doc_id}


def list_submissions_internal() -> list[dict[str, Any]]:
    docs = _list_documents("submissions", order_by="createdAt desc", field_paths=_SUBMISSION_FIELDS)
    return [_map_submission(doc_id, data, include_phone=True) for doc_id, data in docs]


def list_submissions() -> list[dict[str, Any]]:
    internal = list_submissions_internal()
    return [
        {key: value for key, value in item.items() if key not in {"phoneNumber", "name", "role"}}
        for item in internal
    ]


def get_submission_image(submission_id: str) -> str | None:
    data = _get_document("submissions", submission_id)
    if not data:
        return None
    image = data.get("imageBase64")
    return image if isinstance(image, str) and image.strip() else None


def get_submission(submission_id: str) -> dict[str, Any]:
    data = _get_document("submissions", submission_id)
    if not data:
        raise RuntimeError("Submission not found")
    mapped = _map_submission(submission_id, data, include_phone=False)
    return {key: value for key, value in mapped.items() if key != "phoneNumber"}


def list_issues_by_issue_type(issue_type: str) -> list[dict[str, Any]]:
    docs = _run_query("issues", "issueType", "EQUAL", issue_type)
    return [_map_issue(doc_id, data) for doc_id, data in docs]


def list_issues() -> list[dict[str, Any]]:
    docs = _list_documents("issues", order_by="createdAt desc")
    return [_map_issue(doc_id, data) for doc_id, data in docs]


def list_themes_source_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    return list_issues(), list_submissions()


def count_issues() -> int:
    return len(list_issues())


def get_issue(issue_id: str) -> dict[str, Any] | None:
    data = _get_document("issues", issue_id)
    if not data:
        return None
    return _map_issue(issue_id, data)


def create_issue(
    *,
    issue_type: str,
    rep_topic: str,
    rep_description: str,
    rep_locality: str,
    rep_submission_id: str,
    submission_id: str,
    phone_number: str | None = None,
    ai_title: str | None = None,
) -> str:
    fields: dict[str, Any] = {
        "issueType": issue_type,
        "repTopic": rep_topic,
        "repDescription": rep_description,
        "repLocality": rep_locality,
        "repSubmissionId": rep_submission_id,
        "aiTitle": ai_title,
        "status": "Open",
        "submissionIds": [submission_id],
        "subscriberCount": 1 if phone_number else 0,
        "lastNotifiedStatus": None,
        "createdAt": _now_iso(),
    }
    issue_id = _create_document("issues", fields)

    if phone_number:
        _request(
            "POST",
            f"{_api_root()}/issues/{issue_id}/subscribers",
            params=[("documentId", phone_number)],
            json={
                "fields": {
                    "phoneNumber": _encode_value(phone_number),
                    "firstReportedAt": _encode_value(_now_iso()),
                },
            },
        )

    return issue_id


def attach_submission_to_issue(
    issue_id: str,
    submission_id: str,
    *,
    phone_number: str | None = None,
) -> None:
    issue = get_issue(issue_id)
    if not issue:
        raise RuntimeError("Issue not found")

    new_subscriber = False
    if phone_number:
        existing = _get_document(f"issues/{issue_id}/subscribers", phone_number)
        if not existing:
            _request(
                "POST",
                f"{_api_root()}/issues/{issue_id}/subscribers",
                params=[("documentId", phone_number)],
                json={
                    "fields": {
                        "phoneNumber": _encode_value(phone_number),
                        "firstReportedAt": _encode_value(_now_iso()),
                    },
                },
            )
            new_subscriber = True

    submission_ids = list(issue.get("submissionIds") or [])
    if submission_id not in submission_ids:
        submission_ids.append(submission_id)

    patch: dict[str, Any] = {"submissionIds": submission_ids}
    if new_subscriber:
        patch["subscriberCount"] = int(issue.get("subscriberCount") or 0) + 1
    _patch_document("issues", issue_id, patch)


def list_issue_subscribers(issue_id: str) -> list[dict[str, Any]]:
    docs = _list_documents(
        f"issues/{issue_id}/subscribers",
        order_by="firstReportedAt desc",
    )
    subscribers: list[dict[str, Any]] = []
    for doc_id, data in docs:
        phone = data.get("phoneNumber") or doc_id
        subscribers.append(
            {
                "phoneNumber": str(phone),
                "firstReportedAt": data.get("firstReportedAt"),
            },
        )
    return subscribers


def update_issue_status(
    issue_id: str,
    status: str,
    *,
    last_notified_status: str | None = None,
    outcome: str | None = None,
) -> dict[str, Any]:
    patch: dict[str, Any] = {"status": status}
    if status == "Completed":
        patch["completedAt"] = _now_iso()
        if outcome is not None:
            trimmed = outcome.strip()
            patch["outcome"] = trimmed or None
    else:
        patch["completedAt"] = None
        patch["outcome"] = None
    if last_notified_status is not None:
        patch["lastNotifiedStatus"] = last_notified_status

    _patch_document("issues", issue_id, patch)
    updated = get_issue(issue_id)
    if not updated:
        raise RuntimeError("Issue not found after update")
    return updated


def migrate_create_issue(group: dict[str, Any]) -> str:
    phone_numbers = [
        phone
        for phone in dict.fromkeys(
            str(item).strip()
            for item in (group.get("phoneNumbers") or [])
            if str(item).strip()
        )
    ]
    submission_ids = [
        str(item)
        for item in (group.get("submissionIds") or [])
    ]
    fields: dict[str, Any] = {
        "issueType": group.get("issueType") or "",
        "repTopic": group.get("repTopic") or "",
        "repDescription": group.get("repDescription") or "",
        "repLocality": group.get("repLocality") or "",
        "repSubmissionId": group.get("repSubmissionId") or "",
        "aiTitle": group.get("aiTitle"),
        "status": "Open",
        "submissionIds": submission_ids,
        "subscriberCount": len(phone_numbers),
        "lastNotifiedStatus": None,
        "createdAt": _now_iso(),
    }
    issue_id = _create_document("issues", fields)

    for phone_number in phone_numbers:
        _request(
            "POST",
            f"{_api_root()}/issues/{issue_id}/subscribers",
            params=[("documentId", phone_number)],
            json={
                "fields": {
                    "phoneNumber": _encode_value(phone_number),
                    "firstReportedAt": _encode_value(_now_iso()),
                },
            },
        )

    return issue_id
