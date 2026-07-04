"""Gemini-based issue classification from image + description."""

from __future__ import annotations

import base64
import io
import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types
from PIL import Image

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

GEMINI_MAX_EDGE = 768
_client: genai.Client | None = None


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured in backend/.env")
        _client = genai.Client(api_key=api_key)
    return _client


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


def _prepare_gemini_image(image_bytes: bytes, mime_type: str) -> tuple[bytes, str]:
    """Downscale photos before Gemini — classification only needs a small preview."""
    if mime_type == "image/jpeg" and len(image_bytes) < 200_000:
        return image_bytes, mime_type

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.thumbnail((GEMINI_MAX_EDGE, GEMINI_MAX_EDGE), Image.Resampling.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=82)
    return out.getvalue(), "image/jpeg"


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


def default_classification() -> dict[str, Any]:
    """Safe fallback used when Gemini classification is unavailable, so a
    citizen's submission still saves instead of being blocked entirely."""
    return _normalize_result({})


TITLE_PROMPT = """You write short, clear issue headlines for a Member of Parliament's civic dashboard.

A citizen has reported a problem. Their own wording may be rough, incomplete, or misleading.
Read the citizen's topic and description carefully and write ONE concise headline (4 to 9 words)
that captures what the issue is ACTUALLY about — the real underlying problem, not just keywords.

Rules:
- Base it strictly on the citizen's topic and description. Do NOT invent facts.
- Do not be misled by surface words. Example: "no water — somebody building an illegal well without permit"
  is about UNAUTHORIZED WELL CONSTRUCTION, not a water shortage.
- Neutral, factual, title-case-ish. No quotes, no trailing period, no emojis.

Return ONLY JSON: {"title": "<headline>"}"""

TITLE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {"title": {"type": "string"}},
    "required": ["title"],
}


def _fallback_title(topic: str, description: str) -> str:
    base = (topic or "").strip() or (description or "").strip()
    base = " ".join(base.split())
    if len(base) > 80:
        base = base[:77].rstrip() + "…"
    return base or "Citizen issue"


def generate_issue_title(topic: str, description: str) -> str:
    """AI-clean a short issue headline from the citizen's topic + description.

    Never raises — falls back to trimmed citizen text if the model is
    unavailable, so issue creation is never blocked on this.
    """
    topic = (topic or "").strip()
    description = (description or "").strip()
    if not topic and not description:
        return "Citizen issue"

    try:
        client = _get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                TITLE_PROMPT,
                f"Citizen topic: {topic or '(none)'}\nCitizen description: {description or '(none)'}",
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=TITLE_SCHEMA,
                temperature=0.3,
            ),
        )
        text = (response.text or "").strip()
        if not text:
            return _fallback_title(topic, description)
        parsed = json.loads(text)
        title = str(parsed.get("title", "")).strip() if isinstance(parsed, dict) else ""
        title = title.strip().strip('"').strip()
        return title or _fallback_title(topic, description)
    except Exception:
        return _fallback_title(topic, description)


def confirm_same_issue(
    *,
    topic_a: str,
    description_a: str,
    topic_b: str,
    description_b: str,
) -> bool:
    """Ask Gemini whether two citizen reports describe the same underlying problem."""
    topic_a = (topic_a or "").strip()
    description_a = (description_a or "").strip()
    topic_b = (topic_b or "").strip()
    description_b = (description_b or "").strip()

    prompt = """You decide whether two citizen civic complaints are about the SAME underlying real-world problem.

Return ONLY JSON: {"sameIssue": true} or {"sameIssue": false}

Rules:
- Same specific problem at the same place → true (e.g. both about the same broken school wall).
- Same broad category but different problems → false (e.g. potholes vs fallen tree vs illegal well).
- Similar words ("broken road" vs "broken wall") are DIFFERENT issues unless clearly the same incident.
- When unsure, return false — it is better to keep issues separate."""

    schema: dict[str, Any] = {
        "type": "object",
        "properties": {"sameIssue": {"type": "boolean"}},
        "required": ["sameIssue"],
    }

    user = f"""Report A
Topic: {topic_a or "(none)"}
Description: {description_a or "(none)"}

Report B
Topic: {topic_b or "(none)"}
Description: {description_b or "(none)"}"""

    client = _get_client()
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[prompt, user],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_json_schema=schema,
            temperature=0.1,
        ),
    )
    text = (response.text or "").strip()
    if not text:
        return False
    parsed = json.loads(text)
    return bool(parsed.get("sameIssue")) if isinstance(parsed, dict) else False


def classify_issue(image_base64: str, description: str) -> dict[str, Any]:
    """Classify a civic issue using Gemini multimodal input."""
    if not description or not description.strip():
        raise ValueError("Description is required for classification")

    client = _get_client()
    image_bytes, mime_type = _parse_data_url(image_base64)

    contents: list[Any] = [PROMPT, f"Description:\n{description.strip()}"]
    if image_bytes:
        gemini_bytes, gemini_mime = _prepare_gemini_image(image_bytes, mime_type)
        contents.insert(
            1,
            types.Part.from_bytes(data=gemini_bytes, mime_type=gemini_mime),
        )

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=CLASSIFICATION_SCHEMA,
                temperature=0.2,
            ),
        )
    except Exception as exc:
        # Normalize any Google API client error (auth, quota, network, etc.)
        # into a RuntimeError so callers get one consistent exception type
        # to catch, instead of the raw google.genai SDK exception escaping.
        raise RuntimeError(f"Gemini request failed: {exc}") from exc

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

