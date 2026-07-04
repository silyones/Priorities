"""Lightweight MP-only API guard — shared secret header, no session system."""

from __future__ import annotations

import os

from fastapi import Header, HTTPException

MP_API_KEY_HEADER = "X-MP-API-Key"


def require_mp_api_key(
    x_mp_api_key: str | None = Header(default=None, alias=MP_API_KEY_HEADER),
) -> None:
    """Reject requests that do not present the configured MP shared secret."""
    secret = os.getenv("MP_API_SECRET", "").strip()
    if not secret:
        raise HTTPException(
            status_code=503,
            detail="MP_API_SECRET is not configured on the server",
        )
    if not x_mp_api_key or x_mp_api_key.strip() != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")
