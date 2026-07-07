"""Normalize Firebase credentials for Railway and child Node processes."""

from __future__ import annotations

import json
import logging
import os
import tempfile
from typing import Any

logger = logging.getLogger("priorities.firebase")

_CREDENTIALS_PATH = os.path.join(tempfile.gettempdir(), "firebase-service-account.json")
_cached_account: dict[str, Any] | None = None


def _normalize_service_account(data: dict[str, Any]) -> dict[str, Any]:
    key = data.get("private_key")
    if isinstance(key, str):
        data["private_key"] = key.replace("\\n", "\n")
    return data


def _load_service_account_dict() -> dict[str, Any]:
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw:
        return _normalize_service_account(json.loads(raw))

    path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "").strip()
    if path and os.path.isfile(path):
        with open(path, encoding="utf-8") as handle:
            return _normalize_service_account(json.loads(handle.read()))

    raise RuntimeError(
        "Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON "
        "or FIREBASE_SERVICE_ACCOUNT_PATH."
    )


def get_service_account_info() -> dict[str, Any]:
    global _cached_account
    if _cached_account is None:
        _cached_account = _load_service_account_dict()
    return _cached_account


def get_project_id() -> str:
    explicit = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    if explicit:
        return explicit
    project_id = get_service_account_info().get("project_id")
    if isinstance(project_id, str) and project_id.strip():
        return project_id.strip()
    raise RuntimeError("FIREBASE_PROJECT_ID is not configured.")


def materialize_firebase_credentials() -> None:
    """Write inline JSON to a file so Node/Python read a valid key with real newlines."""
    try:
        data = _load_service_account_dict()
    except (RuntimeError, json.JSONDecodeError) as exc:
        logger.error("Firebase credentials unavailable: %s", exc)
        return

    try:
        with open(_CREDENTIALS_PATH, "w", encoding="utf-8") as handle:
            json.dump(data, handle)
    except OSError as exc:
        logger.error("Could not write Firebase credentials file: %s", exc)
        return

    os.environ["FIREBASE_SERVICE_ACCOUNT_PATH"] = _CREDENTIALS_PATH
    os.environ.setdefault("FIRESTORE_PREFER_REST", "true")
    logger.info("Firebase credentials materialized to %s", _CREDENTIALS_PATH)
