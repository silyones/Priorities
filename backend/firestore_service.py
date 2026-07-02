"""Firestore access via the persistent TypeScript bridge worker."""

from __future__ import annotations

from typing import Any

from ts_bridge import bridge_call


def save_submission(payload: dict[str, Any]) -> dict[str, str]:
    data = bridge_call({"action": "firestore:save", "payload": payload})
    return {"id": data["id"]}


def list_submissions() -> list[dict[str, Any]]:
    data = bridge_call({"action": "firestore:list"})
    if not isinstance(data, list):
        raise RuntimeError("Unexpected Firestore list response")
    return data


def get_submission_image(submission_id: str) -> str | None:
    data = bridge_call({"action": "firestore:image", "id": submission_id})
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected Firestore image response")
    image = data.get("imageBase64")
    return image if isinstance(image, str) and image.strip() else None


def get_submission(submission_id: str) -> dict[str, Any]:
    data = bridge_call({"action": "firestore:get", "id": submission_id})
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected Firestore get response")
    return data
