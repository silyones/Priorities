"""Twilio SMS notifications for issue status updates."""

from __future__ import annotations

import logging
import os

import httpx
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("priorities")

TWILIO_API_BASE = "https://api.twilio.com/2010-04-01"


def _twilio_configured() -> bool:
    return bool(
        os.getenv("TWILIO_ACCOUNT_SID", "").strip()
        and os.getenv("TWILIO_AUTH_TOKEN", "").strip()
        and os.getenv("TWILIO_FROM_NUMBER", "").strip()
    )


def format_sms_number(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) == 10:
        return f"+91{digits}"
    if digits.startswith("91") and len(digits) == 12:
        return f"+{digits}"
    if phone.startswith("+"):
        return phone
    return f"+{digits}"


def build_status_message(*, issue_id: str, status: str, topic: str) -> str:
    label = topic.strip() or f"issue {issue_id[:8]}"
    if status == "Work in Progress":
        return (
            f"People's Priorities: Your report on \"{label}\" is now being worked on "
            f"by the MP office. Thank you for raising it."
        )
    if status == "Completed":
        return (
            f"People's Priorities: Your report on \"{label}\" has been marked completed "
            f"by the MP office. Thank you for your patience."
        )
    return f"People's Priorities: Update on \"{label}\" — status: {status}."


def send_sms(*, to: str, body: str) -> None:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()

    if not account_sid or not auth_token or not from_number:
        raise RuntimeError("Twilio is not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)")

    url = f"{TWILIO_API_BASE}/Accounts/{account_sid}/Messages.json"
    to_number = format_sms_number(to)

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            url,
            auth=(account_sid, auth_token),
            data={"From": from_number, "To": to_number, "Body": body},
        )

    if response.status_code >= 400:
        detail = response.text[:300]
        raise RuntimeError(f"Twilio API error {response.status_code}: {detail}")


def notify_issue_subscribers(
    *,
    issue_id: str,
    status: str,
    topic: str,
    phone_numbers: list[str],
) -> None:
    if not phone_numbers:
        logger.info("issue %s status=%s — no subscribers to notify", issue_id, status)
        return

    if not _twilio_configured():
        logger.warning(
            "issue %s status=%s — Twilio not configured; skipping %d SMS",
            issue_id,
            status,
            len(phone_numbers),
        )
        return

    message = build_status_message(issue_id=issue_id, status=status, topic=topic)
    for phone in phone_numbers:
        try:
            send_sms(to=phone, body=message)
            logger.info("SMS sent issue=%s to=%s status=%s", issue_id, phone, status)
        except RuntimeError as exc:
            logger.warning("SMS failed issue=%s to=%s: %s", issue_id, phone, exc)
