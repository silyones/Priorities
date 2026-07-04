"""Groups real citizen submissions into themes by similarity (issue #30).

Mirrors the bag-of-words + cosine similarity approach already used for the
legacy in-memory demo pipeline in backend/src/ai/cluster.ts, so multiple
citizens reporting the same or a similar issue collapse into one theme with
an incremented voice count, instead of each staying its own permanently
separate card with affected=1.
"""

from __future__ import annotations

import re
from typing import Any

from location_service import latest_submission_with_location, resolve_display_location

STOP_WORDS = {
    "the", "a", "an", "is", "are", "to", "of", "in", "on", "at", "and", "for",
    "we", "our", "my", "i", "it", "this", "that", "near", "no", "not", "has",
    "have", "been", "from", "with", "please", "there", "here",
}

# Matches cluster.ts's character class: latin letters plus the Devanagari
# block, covering the Hindi text this app also handles.
_NON_WORD_RE = re.compile(r"[^a-zऀ-ॿ\s]")

SIMILARITY_THRESHOLD = 0.42
# Lexical scores at or above this merge without an extra AI check.
HIGH_CONFIDENCE_THRESHOLD = 0.58
# Scores below this never merge.
MIN_CANDIDATE_THRESHOLD = 0.30
SEVERITY_RANK = {"Safety risk": 2, "High priority": 1, "Normal": 0}


def embed_text(text: str) -> dict[str, int]:
    """Public wrapper used by incremental issue matching."""
    return _embed(text)


def cosine_similarity(a: dict[str, int], b: dict[str, int]) -> float:
    return _cosine(a, b)


def submission_match_score(
    *,
    topic: str,
    description: str,
    locality: str,
    issue_type: str,
    rep_topic: str,
    rep_description: str,
    rep_locality: str,
    rep_issue_type: str,
) -> float:
    """Score how likely two citizen reports are the same underlying issue.

    Topic (citizen heading) is weighted heavily — same neighbourhood often has
    many different problems, so locality must not force a merge on its own.
    """
    if (issue_type or "") != (rep_issue_type or ""):
        return 0.0

    topic_a = (topic or "").strip()
    topic_b = (rep_topic or "").strip()
    topic_sim = _cosine(_embed(topic_a), _embed(topic_b))

    # Different headings with almost no overlap → not the same issue.
    if topic_a and topic_b and topic_sim < 0.22:
        return 0.0

    new_text = f"{topic_a} {description or ''}".strip()
    rep_text = f"{topic_b} {rep_description or ''}".strip()
    text_sim = _cosine(_embed(new_text), _embed(rep_text))

    score = 0.62 * topic_sim + 0.38 * text_sim

    # Tiny locality nudge only when the text already looks related.
    loc = (locality or "").strip().lower()
    rep_loc = (rep_locality or "").strip().lower()
    if score >= 0.28 and loc and loc == rep_loc:
        score += 0.04

    return min(score, 1.0)


def should_merge_submissions(
    *,
    topic: str,
    description: str,
    locality: str,
    issue_type: str,
    rep_topic: str,
    rep_description: str,
    rep_locality: str,
    rep_issue_type: str,
) -> bool:
    """Whether a new submission belongs on an existing issue."""
    score = submission_match_score(
        topic=topic,
        description=description,
        locality=locality,
        issue_type=issue_type,
        rep_topic=rep_topic,
        rep_description=rep_description,
        rep_locality=rep_locality,
        rep_issue_type=rep_issue_type,
    )
    if score < MIN_CANDIDATE_THRESHOLD:
        return False
    if score >= HIGH_CONFIDENCE_THRESHOLD:
        return True
    if score < SIMILARITY_THRESHOLD:
        return False

    try:
        from gemini_service import confirm_same_issue

        return confirm_same_issue(
            topic_a=topic,
            description_a=description,
            topic_b=rep_topic,
            description_b=rep_description,
        )
    except Exception:
        return False


def pick_representative(members: list[dict[str, Any]]) -> dict[str, Any]:
    return max(
        members, key=lambda m: SEVERITY_RANK.get(m.get("severity") or "Normal", 0)
    )


def _embed(text: str) -> dict[str, int]:
    cleaned = _NON_WORD_RE.sub(" ", (text or "").lower())
    vec: dict[str, int] = {}
    for word in cleaned.split():
        if len(word) <= 2 or word in STOP_WORDS:
            continue
        vec[word] = vec.get(word, 0) + 1
    return vec


def _cosine(a: dict[str, int], b: dict[str, int]) -> float:
    dot = sum(v * b.get(k, 0) for k, v in a.items())
    na = sum(v * v for v in a.values()) ** 0.5
    nb = sum(v * v for v in b.values()) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


class _Group:
    __slots__ = ("members",)

    def __init__(self, submission: dict[str, Any]) -> None:
        self.members: list[dict[str, Any]] = [submission]

    def add(self, submission: dict[str, Any]) -> None:
        self.members.append(submission)


def group_submissions(submissions: list[dict[str, Any]]) -> list[_Group]:
    """Cluster submissions — compare each report only to the group representative."""
    groups: list[_Group] = []

    for submission in submissions:
        issue_type = submission.get("issueType") or ""
        topic = str(submission.get("topic") or "")
        description = str(submission.get("description") or "")
        locality = str(submission.get("locality") or "")

        best_group: _Group | None = None
        best_similarity = 0.0
        for group in groups:
            representative = pick_representative(group.members)
            similarity = submission_match_score(
                topic=topic,
                description=description,
                locality=locality,
                issue_type=issue_type,
                rep_topic=str(representative.get("topic") or ""),
                rep_description=str(representative.get("description") or ""),
                rep_locality=str(representative.get("locality") or ""),
                rep_issue_type=str(representative.get("issueType") or ""),
            )
            if similarity > best_similarity:
                best_similarity = similarity
                best_group = group

        if best_group is not None:
            representative = pick_representative(best_group.members)
            if should_merge_submissions(
                topic=topic,
                description=description,
                locality=locality,
                issue_type=issue_type,
                rep_topic=str(representative.get("topic") or ""),
                rep_description=str(representative.get("description") or ""),
                rep_locality=str(representative.get("locality") or ""),
                rep_issue_type=str(representative.get("issueType") or ""),
            ):
                best_group.add(submission)
                continue

        groups.append(_Group(submission))

    return groups


def group_into_themes(submissions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Same category is a strong signal (matches cluster.ts); text similarity
    and locality agreement refine it, same order as the legacy pipeline."""
    return [_build_theme(group) for group in group_submissions(submissions)]


def _build_theme(group: _Group) -> dict[str, Any]:
    members = group.members
    representative = pick_representative(members)
    relay_count = sum(1 for m in members if m.get("submittedFor") == "someone_else")

    # Dashboard shows the latest location citizens provided for this theme.
    location_source = latest_submission_with_location(members) or representative
    locality = resolve_display_location(location_source)

    return {
        "id": representative["id"],
        "topic": representative.get("topic") or "",
        "description": representative.get("description") or "",
        "issueType": representative.get("issueType") or "",
        "severity": representative.get("severity") or "Normal",
        "locality": locality,
        "submittedFor": representative.get("submittedFor") or "myself",
        "affected": len(members),
        "relayShare": relay_count / len(members) if members else 0,
        "sampleQuotes": [m.get("description") or "" for m in members[:5]],
        "createdAt": max((m.get("createdAt") or "" for m in members), default=None) or None,
        "aiTags": representative.get("aiTags") or [],
        "hasImage": any(m.get("hasImage") for m in members),
        "latitude": location_source.get("latitude"),
        "longitude": location_source.get("longitude"),
    }


def build_theme_from_members(
    *,
    issue_id: str,
    members: list[dict[str, Any]],
    rep_submission_id: str,
    issue_status: str = "Open",
    subscriber_count: int = 0,
    completed_at: str | None = None,
) -> dict[str, Any]:
    """Build the API theme shape from persisted issue metadata + member submissions."""
    if not members:
        raise ValueError("Cannot build theme from empty member list")

    by_id = {m["id"]: m for m in members if m.get("id")}
    representative = by_id.get(rep_submission_id) or pick_representative(members)
    relay_count = sum(1 for m in members if m.get("submittedFor") == "someone_else")

    location_source = latest_submission_with_location(members) or representative
    locality = resolve_display_location(location_source)

    return {
        "id": issue_id,
        "repSubmissionId": rep_submission_id,
        "topic": representative.get("topic") or "",
        "description": representative.get("description") or "",
        "issueType": representative.get("issueType") or "",
        "severity": representative.get("severity") or "Normal",
        "locality": locality,
        "submittedFor": representative.get("submittedFor") or "myself",
        "affected": len(members),
        "subscriberCount": subscriber_count,
        "issueStatus": issue_status,
        "completedAt": completed_at,
        "relayShare": relay_count / len(members) if members else 0,
        "sampleQuotes": [m.get("description") or "" for m in members[:5]],
        "createdAt": max((m.get("createdAt") or "" for m in members), default=None) or None,
        "aiTags": representative.get("aiTags") or [],
        "hasImage": any(m.get("hasImage") for m in members),
        "latitude": location_source.get("latitude"),
        "longitude": location_source.get("longitude"),
    }
