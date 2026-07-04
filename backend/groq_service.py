"""Groq-based issue brief generation (summary + recommendations)."""

from __future__ import annotations

import json
import os
import re
from typing import Any

import httpx
from dotenv import load_dotenv

load_dotenv()

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
# Fast, low-cost model on Groq — good for short structured briefs.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

ANALYSIS_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "recommendation": {"type": "array", "items": {"type": "string"}},
        "suggestedDepartment": {"type": "string"},
        "urgencyRationale": {"type": "string"},
        "imageCaption": {"type": "string"},
    },
    "required": [
        "summary",
        "recommendation",
        "suggestedDepartment",
        "urgencyRationale",
        "imageCaption",
    ],
}

SYSTEM_PROMPT = """You are an assistant to a Member of Parliament in Bengaluru North constituency.

Given a citizen's civic complaint, produce a concise issue brief for the MP office.

CRITICAL: Base your understanding on the citizen's own TOPIC and DESCRIPTION — that is the source of truth
for what the problem actually is. The classification fields (issueType, aiTags) are rough auto-labels and
may be WRONG or misleading; treat them as weak hints only, never as the definition of the problem.
Example: a report tagged "Water Supply" whose description says "somebody is building an illegal well without
a permit" is about UNAUTHORIZED WELL CONSTRUCTION, not a water shortage — write the brief accordingly.

Return ONLY valid JSON with these keys:
- summary: 2-3 sentences — what the problem actually is (per the citizen's words), who is affected, and why it matters
- recommendation: array of 3-5 specific, actionable next steps (e.g. forward to BBMP, site visit within 48h)
- suggestedDepartment: primary department or agency to route this to (e.g. BESCOM, BWSSB, BBMP Roads, Education Dept)
- urgencyRationale: one sentence explaining the severity assessment
- imageCaption: if a photo was attached, one sentence on likely visible evidence from the description/tags; otherwise ""

Be practical, non-partisan, and focused on constituent service. Use Indian civic context where relevant."""


def _get_api_key() -> str:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not configured in backend/.env")
    return api_key


def _normalize_analysis(data: dict[str, Any], *, has_image: bool) -> dict[str, Any]:
    summary = str(data.get("summary", "")).strip()
    if not summary:
        summary = "Citizen report received; review details below."

    recs = data.get("recommendation") or []
    if not isinstance(recs, list):
        recs = [str(recs)]
    recommendation = [str(r).strip() for r in recs if str(r).strip()][:6]
    if not recommendation:
        recommendation = [
            "Review the citizen's report and verify the location.",
            "Forward to the relevant municipal department.",
            "Follow up after action is taken.",
        ]

    department = str(data.get("suggestedDepartment", "")).strip() or "Local municipal office"
    rationale = str(data.get("urgencyRationale", "")).strip() or "Based on citizen report and classification."
    caption = str(data.get("imageCaption", "")).strip() if has_image else ""

    return {
        "summary": summary,
        "recommendation": recommendation,
        "suggestedDepartment": department,
        "urgencyRationale": rationale,
        "imageCaption": caption,
    }


def default_analysis(
    *,
    description: str,
    issue_type: str = "",
    severity: str = "",
    has_image: bool = False,
) -> dict[str, Any]:
    """Fallback when Groq analysis is unavailable."""
    snippet = description.strip()[:220]
    if len(description.strip()) > 220:
        snippet += "…"
    return _normalize_analysis(
        {
            "summary": snippet or "Citizen report received; review details below.",
            "recommendation": [
                "Review the citizen's report and verify the location.",
                f"Forward to the relevant {issue_type or 'civic'} department.",
                "Follow up after action is taken.",
            ],
            "suggestedDepartment": issue_type or "Local municipal office",
            "urgencyRationale": f"Classified as {severity or 'Normal'} based on submission data.",
            "imageCaption": "Photo attached — review manually." if has_image else "",
        },
        has_image=has_image,
    )


def _extract_json(text: str) -> dict[str, Any]:
    raw = text.strip()
    if not raw:
        raise RuntimeError("Groq returned an empty analysis response")

    try:
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        parsed = json.loads(match.group(0))
        if isinstance(parsed, dict):
            return parsed

    raise RuntimeError(f"Groq returned invalid JSON: {raw[:200]}")


def analyze_issue(
    *,
    image_base64: str,
    topic: str,
    description: str,
    issue_type: str,
    severity: str,
    ai_tags: list[str],
    locality: str,
    submitted_for: str,
) -> dict[str, Any]:
    """Generate MP-facing AI brief for a single citizen submission via Groq."""
    if not description or not description.strip():
        raise ValueError("Description is required for analysis")

    has_image = bool(image_base64 and str(image_base64).strip())
    tags_text = ", ".join(ai_tags) if ai_tags else "none"
    photo_note = "yes — describe likely visible evidence in imageCaption" if has_image else "no"

    user_content = f"""CITIZEN'S OWN WORDS (source of truth — base the brief on this):
Topic: {topic.strip() or "(not provided)"}
Description:
{description.strip()}

Auto-classification hints (may be inaccurate — do not let these override the citizen's words):
- issueType: {issue_type or "unknown"}
- severity: {severity or "Normal"}
- aiTags: {tags_text}
- locality: {locality.strip() or "unknown"}
- submittedFor: {submitted_for or "myself"}
- photoAttached: {photo_note}"""

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.3,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }

    try:
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {_get_api_key()}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise RuntimeError(f"Groq request failed: {exc}") from exc

    if response.status_code >= 400:
        detail = response.text[:300]
        raise RuntimeError(f"Groq API error {response.status_code}: {detail}")

    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Groq returned no choices")

    message = choices[0].get("message") or {}
    text = str(message.get("content", "")).strip()
    parsed = _extract_json(text)
    return _normalize_analysis(parsed, has_image=has_image)
