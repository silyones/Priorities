"""Normalize Firebase credentials for Railway and child Node processes."""

from __future__ import annotations

import json
import logging
import os
import tempfile
from typing import Any

logger = logging.getLogger("priorities.firebase")

_CREDENTIALS_PATH = os.path.join(tempfile.gettempdir(), "firebase-service-account.json")


def _normalize_service_account(data: dict[str, Any]) -> dict[str, Any]:
    key = data.get("private_key")
    if isinstance(key, str):
        data["private_key"] = key.replace("\\n", "\n")
    return data


def materialize_firebase_credentials() -> None:
    """Write inline JSON to a file so Node/Python read a valid key with real newlines."""
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return

    try:
        data = _normalize_service_account(json.loads(raw))
    except json.JSONDecodeError as exc:
        logger.error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON — cannot parse: %s", exc)
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
