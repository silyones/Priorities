"""Phone number validation for citizen submissions."""

from __future__ import annotations

import re


def normalize_phone_input(value: str) -> str:
    return re.sub(r"[\s\-()]", "", (value or "").strip())


def parse_phone_number(value: str) -> str | None:
    """Return normalized 10-digit string, or None if blank. Raises ValueError if invalid."""
    normalized = normalize_phone_input(value)
    if not normalized:
        return None

    if normalized.startswith("+91"):
        normalized = normalized[3:]
    elif normalized.startswith("91") and len(normalized) == 12:
        normalized = normalized[2:]

    if re.fullmatch(r"\d{10}", normalized):
        return normalized

    raise ValueError(
        "Phone number must be 10 digits, with optional country code (+91 or 91)"
    )
