"""Persisted issue matching and theme assembly for live Firestore submissions."""

from __future__ import annotations

from typing import Any

from firestore_service import (
    attach_submission_to_issue,
    create_issue,
    get_issue,
    list_issue_subscribers,
    list_issues,
    list_issues_by_issue_type,
    list_submissions,
    update_issue_status,
)
from theme_service import (
    SIMILARITY_THRESHOLD,
    build_theme_from_members,
    group_submissions,
    pick_representative,
    submission_match_score,
)

NOTIFY_STATUSES = {"Work in Progress", "Completed"}


def assign_to_issue(submission: dict[str, Any]) -> str:
    """Attach a new submission to a matching persisted issue, or create one."""
    submission_id = str(submission.get("id") or "").strip()
    if not submission_id:
        raise ValueError("Submission id is required")

    issue_type = str(submission.get("issueType") or "")
    description = str(submission.get("description") or "")
    locality = str(submission.get("locality") or "")
    phone = submission.get("phoneNumber")
    phone_number = str(phone).strip() if isinstance(phone, str) and phone.strip() else None

    candidates = list_issues_by_issue_type(issue_type)
    best_issue: dict[str, Any] | None = None
    best_score = 0.0

    for issue in candidates:
        score = submission_match_score(
            description=description,
            locality=locality,
            issue_type=issue_type,
            rep_description=str(issue.get("repDescription") or ""),
            rep_locality=str(issue.get("repLocality") or ""),
            rep_issue_type=str(issue.get("issueType") or ""),
        )
        if score > best_score:
            best_score = score
            best_issue = issue

    if best_issue is not None and best_score >= SIMILARITY_THRESHOLD:
        attach_submission_to_issue(
            best_issue["id"],
            submission_id,
            phone_number=phone_number,
        )
        return best_issue["id"]

    return create_issue(
        issue_type=issue_type,
        rep_description=description,
        rep_locality=locality,
        rep_submission_id=submission_id,
        submission_id=submission_id,
        phone_number=phone_number,
    )


def issues_to_themes() -> list[dict[str, Any]]:
    """Read persisted issues and shape them like GET /api/submissions/themes."""
    issues = list_issues()
    if not issues:
        return []

    submissions = list_submissions()
    by_id = {s["id"]: s for s in submissions if s.get("id")}

    themes: list[dict[str, Any]] = []
    for issue in issues:
        members = [by_id[sid] for sid in issue.get("submissionIds", []) if sid in by_id]
        if not members:
            continue
        themes.append(
            build_theme_from_members(
                issue_id=issue["id"],
                members=members,
                rep_submission_id=str(issue.get("repSubmissionId") or members[0]["id"]),
                issue_status=str(issue.get("status") or "Open"),
                subscriber_count=int(issue.get("subscriberCount") or 0),
            )
        )
    return themes


def get_issue_detail(issue_id: str) -> dict[str, Any]:
    issue = get_issue(issue_id)
    if not issue:
        raise LookupError("Issue not found")

    submissions = list_submissions()
    by_id = {s["id"]: s for s in submissions if s.get("id")}
    members = [by_id[sid] for sid in issue.get("submissionIds", []) if sid in by_id]
    if not members:
        raise LookupError("Issue has no linked submissions")

    rep_id = str(issue.get("repSubmissionId") or members[0]["id"])
    rep = by_id.get(rep_id) or pick_representative(members)
    theme = build_theme_from_members(
        issue_id=issue["id"],
        members=members,
        rep_submission_id=rep_id,
        issue_status=str(issue.get("status") or "Open"),
        subscriber_count=int(issue.get("subscriberCount") or 0),
    )

    return {
        **theme,
        "name": rep.get("name") or "",
        "role": rep.get("role") or "",
        "submissionIds": issue.get("submissionIds") or [],
    }


def get_subscribers(issue_id: str) -> list[dict[str, Any]]:
    return list_issue_subscribers(issue_id)


def patch_issue_status(issue_id: str, status: str) -> dict[str, Any]:
    allowed = {"Open", "Work in Progress", "Completed"}
    if status not in allowed:
        raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")

    issue = get_issue(issue_id)
    if not issue:
        raise LookupError("Issue not found")

    updated = update_issue_status(issue_id, status)
    return updated


def subscribers_for_notification(issue_id: str) -> list[str]:
    rows = list_issue_subscribers(issue_id)
    return [str(row.get("phoneNumber") or "").strip() for row in rows if row.get("phoneNumber")]


def migration_groups_from_submissions() -> list[dict[str, Any]]:
    """Build issue seed rows from current submissions via group_submissions()."""
    from firestore_service import list_submissions_internal

    submissions = list_submissions_internal()
    groups: list[dict[str, Any]] = []

    for group in group_submissions(submissions):
        members = group.members
        if not members:
            continue
        representative = pick_representative(members)
        phone_numbers = [
            str(s.get("phoneNumber")).strip()
            for s in members
            if isinstance(s.get("phoneNumber"), str) and str(s.get("phoneNumber")).strip()
        ]
        groups.append(
            {
                "issueType": representative.get("issueType") or "",
                "repDescription": representative.get("description") or "",
                "repLocality": representative.get("locality") or "",
                "repSubmissionId": representative["id"],
                "submissionIds": [m["id"] for m in members if m.get("id")],
                "phoneNumbers": phone_numbers,
            }
        )

    return groups
