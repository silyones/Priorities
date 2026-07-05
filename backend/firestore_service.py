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


def list_submissions_internal() -> list[dict[str, Any]]:
    data = bridge_call({"action": "firestore:listInternal"})
    if not isinstance(data, list):
        raise RuntimeError("Unexpected Firestore internal list response")
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


def list_issues_by_issue_type(issue_type: str) -> list[dict[str, Any]]:
    data = bridge_call(
        {"action": "issues:listByType", "payload": {"issueType": issue_type}}
    )
    if not isinstance(data, list):
        raise RuntimeError("Unexpected issues listByType response")
    return data


def list_issues() -> list[dict[str, Any]]:
    data = bridge_call({"action": "issues:list"})
    if not isinstance(data, list):
        raise RuntimeError("Unexpected issues list response")
    return data


def list_themes_source_data() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Issues + lean submissions in one bridge round-trip (dashboard themes)."""
    data = bridge_call({"action": "themes:listSource"})
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected themes listSource response")
    issues = data.get("issues")
    submissions = data.get("submissions")
    if not isinstance(issues, list) or not isinstance(submissions, list):
        raise RuntimeError("Unexpected themes listSource shape")
    return issues, submissions


def count_issues() -> int:
    data = bridge_call({"action": "issues:count"})
    if not isinstance(data, int):
        raise RuntimeError("Unexpected issues count response")
    return data


def get_issue(issue_id: str) -> dict[str, Any] | None:
    try:
        data = bridge_call({"action": "issues:get", "id": issue_id})
    except RuntimeError as exc:
        if "not found" in str(exc).lower():
            return None
        raise
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected issue get response")
    return data


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
    payload: dict[str, Any] = {
        "issueType": issue_type,
        "repTopic": rep_topic,
        "repDescription": rep_description,
        "repLocality": rep_locality,
        "repSubmissionId": rep_submission_id,
        "submissionId": submission_id,
    }
    if phone_number:
        payload["phoneNumber"] = phone_number
    if ai_title:
        payload["aiTitle"] = ai_title
    data = bridge_call({"action": "issues:create", "payload": payload})
    if not isinstance(data, dict) or not data.get("id"):
        raise RuntimeError("Unexpected issue create response")
    return str(data["id"])


def attach_submission_to_issue(
    issue_id: str,
    submission_id: str,
    *,
    phone_number: str | None = None,
) -> None:
    payload: dict[str, Any] = {
        "issueId": issue_id,
        "submissionId": submission_id,
    }
    if phone_number:
        payload["phoneNumber"] = phone_number
    bridge_call({"action": "issues:attach", "payload": payload})


def list_issue_subscribers(issue_id: str) -> list[dict[str, Any]]:
    data = bridge_call({"action": "issues:subscribers", "id": issue_id})
    if not isinstance(data, list):
        raise RuntimeError("Unexpected issue subscribers response")
    return data


def update_issue_status(
    issue_id: str,
    status: str,
    *,
    last_notified_status: str | None = None,
    outcome: str | None = None,
) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": status}
    if last_notified_status is not None:
        payload["lastNotifiedStatus"] = last_notified_status
    if outcome is not None:
        payload["outcome"] = outcome
    data = bridge_call(
        {
            "action": "issues:updateStatus",
            "id": issue_id,
            "payload": payload,
        }
    )
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected issue updateStatus response")
    return data


def migrate_create_issue(group: dict[str, Any]) -> str:
    data = bridge_call({"action": "issues:migrateCreate", "payload": group})
    if not isinstance(data, dict) or not data.get("id"):
        raise RuntimeError("Unexpected migrate create response")
    return str(data["id"])
