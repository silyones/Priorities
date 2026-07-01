"""Gemini-based issue classification from image + description."""

from __future__ import annotations

import base64
import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

ISSUE_TYPES = (
    "Sanitation",
    "Drainage",
    "Roads",
    "Water Supply",
    "Electricity",
)

SEVERITY_LEVELS = (
    "Safety risk",
    "High priority",
    "Normal",
)

CLASSIFICATION_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "issueType": {
            "type": "string",
            "enum": list(ISSUE_TYPES),
        },
        "severity": {
            "type": "string",
            "enum": list(SEVERITY_LEVELS),
        },
        "aiTags": {
            "type": "array",
            "items": {"type": "string"},
        },
    },
    "required": ["issueType", "severity", "aiTags"],
}

PROMPT = """You classify civic infrastructure complaints for a local government portal.

Given a citizen's description and optional photo, return JSON with:
- issueType: one of Sanitation, Drainage, Roads, Water Supply, Electricity
- severity: Safety risk (immediate danger), High priority (urgent but not life-threatening), or Normal
- aiTags: 3-6 short lowercase keywords summarizing the issue (e.g. "pothole", "open drain", "garbage pile")

Use the photo when present; otherwise rely on the description. Be concise and practical."""


def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")
    return genai.Client(api_key=api_key)


def _parse_data_url(image_base64: str) -> tuple[bytes | None, str]:
    if not image_base64 or not image_base64.strip():
        return None, "image/jpeg"

    raw = image_base64.strip()
    match = re.match(r"^data:(image/[\w.+-]+);base64,(.+)$", raw, re.DOTALL | re.IGNORECASE)
    if match:
        mime_type = match.group(1)
        payload = match.group(2)
    else:
        mime_type = "image/jpeg"
        payload = raw

    try:
        return base64.b64decode(payload, validate=True), mime_type
    except Exception as exc:
        raise ValueError("Invalid imageBase64 payload") from exc


def _normalize_result(data: dict[str, Any]) -> dict[str, Any]:
    issue_type = data.get("issueType", "Sanitation")
    if issue_type not in ISSUE_TYPES:
        issue_type = "Sanitation"

    severity = data.get("severity", "Normal")
    if severity not in SEVERITY_LEVELS:
        severity = "Normal"

    tags = data.get("aiTags") or []
    if not isinstance(tags, list):
        tags = [str(tags)]
    ai_tags = [str(tag).strip() for tag in tags if str(tag).strip()][:8]

    return {
        "issueType": issue_type,
        "severity": severity,
        "aiTags": ai_tags,
    }


def classify_issue(image_base64: str, description: str) -> dict[str, Any]:
    """Classify a civic issue using Gemini multimodal input."""
    if not description or not description.strip():
        raise ValueError("Description is required for classification")

    client = _get_client()
    image_bytes, mime_type = _parse_data_url(image_base64)

    contents: list[Any] = [PROMPT, f"Description:\n{description.strip()}"]
    if image_bytes:
        contents.insert(
            1,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        )

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=CLASSIFICATION_SCHEMA,
            temperature=0.2,
        ),
    )

    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty classification response")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Gemini returned invalid JSON: {text[:200]}") from exc

    if not isinstance(parsed, dict):
        raise RuntimeError("Gemini classification response was not a JSON object")

    return _normalize_result(parsed)
