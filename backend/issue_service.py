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
    list_themes_source_data,
    update_issue_status,
)
from theme_service import (
    build_theme_from_members,
    group_submissions,
    pick_representative,
    should_merge_submissions,
    submission_match_score,
)

NOTIFY_STATUSES = {"Work in Progress", "Completed"}


def assign_to_issue(submission: dict[str, Any]) -> str:
    """Attach a new submission to a matching persisted issue, or create one."""
    submission_id = str(submission.get("id") or "").strip()
    if not submission_id:
        raise ValueError("Submission id is required")

    issue_type = str(submission.get("issueType") or "")
    topic = str(submission.get("topic") or "")
    description = str(submission.get("description") or "")
    locality = str(submission.get("locality") or "")
    phone = submission.get("phoneNumber")
    phone_number = str(phone).strip() if isinstance(phone, str) and phone.strip() else None

    candidates = [
        i for i in list_issues_by_issue_type(issue_type) if i.get("status") != "Completed"
    ]
    best_issue: dict[str, Any] | None = None
    best_score = 0.0

    for issue in candidates:
        score = submission_match_score(
            topic=topic,
            description=description,
            locality=locality,
            issue_type=issue_type,
            rep_topic=str(issue.get("repTopic") or ""),
            rep_description=str(issue.get("repDescription") or ""),
            rep_locality=str(issue.get("repLocality") or ""),
            rep_issue_type=str(issue.get("issueType") or ""),
        )
        if score > best_score:
            best_score = score
            best_issue = issue

    if best_issue is not None and should_merge_submissions(
        topic=topic,
        description=description,
        locality=locality,
        issue_type=issue_type,
        rep_topic=str(best_issue.get("repTopic") or ""),
        rep_description=str(best_issue.get("repDescription") or ""),
        rep_locality=str(best_issue.get("repLocality") or ""),
        rep_issue_type=str(best_issue.get("issueType") or ""),
    ):
        attach_submission_to_issue(
            best_issue["id"],
            submission_id,
            phone_number=phone_number,
        )
        return best_issue["id"]

    ai_title = _safe_generate_title(topic, description)

    return create_issue(
        issue_type=issue_type,
        rep_topic=topic,
        rep_description=description,
        rep_locality=locality,
        rep_submission_id=submission_id,
        submission_id=submission_id,
        phone_number=phone_number,
        ai_title=ai_title,
    )


def _safe_generate_title(topic: str, description: str) -> str:
    """Generate an AI issue title; never let it block issue creation."""
    try:
        from gemini_service import generate_issue_title

        return generate_issue_title(topic, description)
    except Exception:
        base = (topic or "").strip() or (description or "").strip()
        base = " ".join(base.split())
        return (base[:77].rstrip() + "…") if len(base) > 80 else (base or "Citizen issue")


def issues_to_themes(*, include_completed: bool = False) -> list[dict[str, Any]]:
    """Read persisted issues and shape them like GET /api/submissions/themes."""
    issues, submissions = list_themes_source_data()
    if not issues:
        return []

    by_id = {s["id"]: s for s in submissions if s.get("id")}

    themes: list[dict[str, Any]] = []
    for issue in issues:
        status = str(issue.get("status") or "Open")
        if not include_completed and status == "Completed":
            continue
        members = [by_id[sid] for sid in issue.get("submissionIds", []) if sid in by_id]
        if not members:
            continue
        themes.append(
            _theme_from_issue_and_members(issue, members),
        )
    return themes


def _theme_from_issue_and_members(
    issue: dict[str, Any],
    members: list[dict[str, Any]],
) -> dict[str, Any]:
    return build_theme_from_members(
        issue_id=issue["id"],
        members=members,
        rep_submission_id=str(issue.get("repSubmissionId") or members[0]["id"]),
        issue_status=str(issue.get("status") or "Open"),
        subscriber_count=int(issue.get("subscriberCount") or 0),
        completed_at=issue.get("completedAt"),
    )


def completed_issues_for_showcase() -> list[dict[str, Any]]:
    """Completed live issues as Cluster-shaped items for GET /api/showcase."""
    issues, submissions = list_themes_source_data()
    if not issues:
        return []

    by_id = {s["id"]: s for s in submissions if s.get("id")}

    items: list[dict[str, Any]] = []
    for issue in issues:
        if str(issue.get("status") or "") != "Completed":
            continue
        members = [by_id[sid] for sid in issue.get("submissionIds", []) if sid in by_id]
        if not members:
            continue
        theme = _theme_from_issue_and_members(issue, members)
        items.append(
            _theme_to_showcase_item(
                theme,
                outcome=str(issue.get("outcome") or "").strip() or None,
            )
        )

    items.sort(key=lambda item: item.get("publishedAt") or "", reverse=True)
    return items


def _theme_to_showcase_item(
    theme: dict[str, Any],
    *,
    outcome: str | None = None,
) -> dict[str, Any]:
    title = (theme.get("topic") or "").strip() or (theme.get("description") or "").strip()[:80]
    if not title:
        title = "Citizen issue resolved"
    display_outcome = (outcome or "").strip() or title
    completed = theme.get("completedAt") or theme.get("createdAt")
    published_at = completed[:10] if isinstance(completed, str) and completed else None
    issue_type = str(theme.get("issueType") or "")
    category = {
        "Sanitation": "sanitation",
        "Drainage": "sanitation",
        "Roads": "roads",
        "Water Supply": "water",
        "Electricity": "electricity",
    }.get(issue_type, "other")
    severity = str(theme.get("severity") or "Normal")
    urgency = (
        "safety"
        if severity == "Safety risk"
        else "high"
        if severity == "High priority"
        else "normal"
    )
    return {
        "id": theme["id"],
        "title": title,
        "category": category,
        "ward": "",
        "locality": theme.get("locality") or "Location not provided",
        "affected": int(theme.get("affected") or 1),
        "urgency": urgency,
        "status": "published",
        "score": 0,
        "rationale": {
            "demandComponent": 0,
            "urgencyComponent": 0,
            "dataComponent": 0,
        },
        "geo": {"x": 50, "y": 50},
        "sampleQuotes": theme.get("sampleQuotes") or [],
        "relayShare": float(theme.get("relayShare") or 0),
        "outcome": display_outcome,
        "publishedAt": published_at,
        "isLiveSubmission": True,
    }


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
        completed_at=issue.get("completedAt"),
    )

    ordered_members = [by_id[sid] for sid in issue.get("submissionIds", []) if sid in by_id]
    voices = [
        {
            "id": m.get("id") or "",
            "topic": (m.get("topic") or "").strip(),
            "description": (m.get("description") or "").strip(),
        }
        for m in ordered_members
    ]

    return {
        **theme,
        "aiTitle": (issue.get("aiTitle") or "").strip(),
        "name": rep.get("name") or "",
        "role": rep.get("role") or "",
        "submissionIds": issue.get("submissionIds") or [],
        "voices": voices,
    }


def get_subscribers(issue_id: str) -> list[dict[str, Any]]:
    return list_issue_subscribers(issue_id)


def patch_issue_status(
    issue_id: str,
    status: str,
    *,
    outcome: str | None = None,
) -> dict[str, Any]:
    allowed = {"Open", "Work in Progress", "Completed"}
    if status not in allowed:
        raise ValueError(f"Status must be one of: {', '.join(sorted(allowed))}")

    issue = get_issue(issue_id)
    if not issue:
        raise LookupError("Issue not found")

    updated = update_issue_status(issue_id, status, outcome=outcome)
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
                "repTopic": representative.get("topic") or "",
                "repDescription": representative.get("description") or "",
                "repLocality": representative.get("locality") or "",
                "repSubmissionId": representative["id"],
                "submissionIds": [m["id"] for m in members if m.get("id")],
                "phoneNumbers": phone_numbers,
            }
        )

    return groups
