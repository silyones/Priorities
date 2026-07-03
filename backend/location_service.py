"""Resolve a human-readable location label for dashboard themes."""

from __future__ import annotations

import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)

_COORDS_IN_TEXT_RE = re.compile(
    r"^\s*-?\d+(?:\.\d+)?\s*°?\s*[NSns]?\s*,\s*-?\d+(?:\.\d+)?\s*°?\s*[EWew]?\s*$"
)

# In-memory cache keyed by rounded coordinates (~11 m precision).
_geocode_cache: dict[str, str] = {}


def _has_coordinates(submission: dict[str, Any]) -> bool:
    lat = submission.get("latitude")
    lng = submission.get("longitude")
    return isinstance(lat, (int, float)) and isinstance(lng, (int, float))


def _format_coordinates(lat: float, lng: float) -> str:
    lat_dir = "N" if lat >= 0 else "S"
    lng_dir = "E" if lng >= 0 else "W"
    return f"{abs(lat):.4f}°{lat_dir}, {abs(lng):.4f}°{lng_dir}"


def _cache_key(lat: float, lng: float) -> str:
    return f"{round(lat, 4)},{round(lng, 4)}"


def _label_from_address(address: dict[str, str]) -> str:
    """Build a short place name from Nominatim address parts."""
    parts: list[str] = []
    for key in (
        "suburb",
        "neighbourhood",
        "village",
        "town",
        "city_district",
        "city",
        "county",
        "state_district",
        "state",
    ):
        value = (address.get(key) or "").strip()
        if value and value not in parts:
            parts.append(value)
        if len(parts) >= 2:
            break
    return ", ".join(parts)


def reverse_geocode(lat: float, lng: float) -> str | None:
    """Reverse-geocode coordinates via OpenStreetMap Nominatim."""
    key = _cache_key(lat, lng)
    cached = _geocode_cache.get(key)
    if cached is not None:
        return cached or None

    params = urllib.parse.urlencode(
        {"lat": lat, "lon": lng, "format": "json", "zoom": 16, "addressdetails": 1}
    )
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "PeoplesPriorities/1.0 (constituency dashboard)"},
    )

    label = ""
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        address = payload.get("address") or {}
        if isinstance(address, dict):
            label = _label_from_address({str(k): str(v) for k, v in address.items()})
        if not label:
            display_name = (payload.get("display_name") or "").strip()
            if display_name:
                label = display_name.split(",")[0].strip()
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.warning("reverse geocode failed for %s,%s: %s", lat, lng, exc)

    _geocode_cache[key] = label
    return label or None


def _looks_like_coordinates(text: str) -> bool:
    return bool(_COORDS_IN_TEXT_RE.match(text.strip()))


def resolve_display_location(submission: dict[str, Any]) -> str:
    """Prefer typed locality; otherwise derive a name from GPS coordinates."""
    locality = (submission.get("locality") or "").strip()
    if locality and not _looks_like_coordinates(locality):
        return locality

    if not _has_coordinates(submission):
        return locality

    lat = float(submission["latitude"])
    lng = float(submission["longitude"])
    return reverse_geocode(lat, lng) or _format_coordinates(lat, lng)


def latest_submission_with_location(
    members: list[dict[str, Any]],
) -> dict[str, Any] | None:
    """Return the most recent member that has typed locality or GPS coordinates."""

    def has_location(submission: dict[str, Any]) -> bool:
        locality = (submission.get("locality") or "").strip()
        if locality and not _looks_like_coordinates(locality):
            return True
        return _has_coordinates(submission)

    candidates = [m for m in members if has_location(m)]
    if not candidates:
        return None
    return max(candidates, key=lambda m: m.get("createdAt") or "")
