"""Sarvam speech-to-text (ported from src/sarvam.ts)."""

from __future__ import annotations

import os

import httpx

SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"


def transcribe_audio(content: bytes, mime_type: str, filename: str) -> dict[str, str | None]:
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        raise RuntimeError("SARVAM_API_KEY is not configured on the server")

    files = {"file": (filename, content, mime_type)}
    data = {"model": "saaras:v3", "mode": "transcribe"}

    with httpx.Client(timeout=120.0) as client:
        response = client.post(
            SARVAM_STT_URL,
            headers={"api-subscription-key": api_key},
            data=data,
            files=files,
        )

    try:
        body = response.json()
    except ValueError as exc:
        raise RuntimeError("Sarvam STT returned invalid JSON") from exc

    if response.status_code >= 400:
        detail = (
            (body.get("error") or {}).get("message")
            or body.get("message")
            or f"Sarvam STT failed ({response.status_code})"
        )
        raise RuntimeError(detail)

    transcript = (body.get("transcript") or "").strip()
    if not transcript:
        raise RuntimeError("No speech detected. Try speaking again.")

    return {
        "transcript": transcript,
        "language_code": body.get("language_code"),
        "request_id": body.get("request_id") or "",
    }
