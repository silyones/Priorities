"""FastAPI backend — port 3001 (single source of truth)."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel

from firestore_service import (
    get_issue,
    get_submission,
    get_submission_image,
    list_submissions,
    save_submission,
    update_issue_status,
)
from gemini_service import classify_issue, default_classification
from groq_service import analyze_issue, default_analysis
from issue_service import (
    NOTIFY_STATUSES,
    assign_to_issue,
    completed_issues_for_showcase,
    get_issue_detail,
    get_subscribers,
    issues_for_heatmap,
    issues_to_themes,
    patch_issue_status,
)
from location_service import resolve_display_location
from mp_auth import require_mp_api_key
from phone_utils import parse_phone_number
from sarvam_service import parse_audio_data_url, transcribe_audio
from store_service import act_on_cluster, get_clusters, get_showcase, submit_voice
from ts_bridge import warm_bridge

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("priorities")

PORT = int(os.getenv("PORT", "3001"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
MP_FRONTEND_ORIGIN = os.getenv("MP_FRONTEND_ORIGIN", "http://localhost:3002")

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        f"{FRONTEND_ORIGIN},{MP_FRONTEND_ORIGIN}",
    ).split(",")
    if origin.strip()
]


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await asyncio.to_thread(warm_bridge)
    yield

app = FastAPI(title="People's Priorities API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Compress responses over ~1KB — matters most on the weak/metered connections
# this app is built for (submissions/clusters lists, images excluded since
# they're already compressed and gzip wouldn't help).
app.add_middleware(GZipMiddleware, minimum_size=1024)


class SubmissionBody(BaseModel):
    submittedFor: Literal["myself", "someone_else"]
    name: str = ""
    role: str = ""
    locality: str = ""
    topic: str = ""
    # Optional because a voice-only submission (citizen can't type) may
    # arrive with no typed text at all — the audio gets transcribed
    # server-side instead, see create_submission below.
    description: str = ""
    imageBase64: str = ""
    audioBase64: str = ""
    latitude: float | None = None
    longitude: float | None = None
    phoneNumber: str = ""


class SubmitBody(BaseModel):
    rawText: str
    source: Literal["self", "relay"] = "self"
    relayWorkerRole: str | None = None
    locality: str | None = None


class ClusterPatchBody(BaseModel):
    status: str | None = None
    officeNote: str | None = None
    gapNote: str | None = None
    publish: dict[str, Any] | None = None


class SubmissionAnalysisBody(BaseModel):
    id: str
    topic: str = ""
    description: str
    issueType: str = ""
    severity: str = ""
    aiTags: list[str] = []
    locality: str = ""
    submittedFor: str = ""
    hasImage: bool = False


class IssueStatusBody(BaseModel):
    status: Literal["Open", "Work in Progress", "Completed"]
    outcome: str | None = None


def _runtime_error_status(message: str, firebase: bool = False) -> int:
    if firebase and "Firebase" in message:
        return 503
    if "permissions" in message.lower():
        return 503
    if "not found" in message.lower():
        return 404
    if "empty submission" in message.lower():
        return 400
    return 500


@app.post("/api/submissions")
async def create_submission(body: SubmissionBody) -> dict[str, Any]:
    if body.submittedFor not in ("myself", "someone_else"):
        raise HTTPException(status_code=400, detail="Invalid submittedFor value")

    description = body.description.strip()

    # A citizen who can't type may submit voice-only, with no typed
    # description at all. Transcribe it here, server-side, where a stable
    # connection is a given — the citizen's own device never has to be
    # online long enough to transcribe anything itself.
    if body.audioBase64:
        try:
            audio_bytes, mime_type = parse_audio_data_url(body.audioBase64)
            if audio_bytes:
                result = await asyncio.to_thread(
                    transcribe_audio, audio_bytes, mime_type, "recording"
                )
                transcript = result["transcript"].strip() if result["transcript"] else ""
                if transcript:
                    description = f"{description} {transcript}".strip() if description else transcript
        except (ValueError, RuntimeError) as exc:
            # Never lose the submission over a transcription hiccup — flag it
            # for manual follow-up instead of silently dropping the citizen's
            # voice.
            logger.warning("Voice submission transcription failed: %s", exc)
            if not description:
                description = "(Voice submission — automatic transcription failed. Please follow up to hear the recording.)"

    if not description:
        raise HTTPException(status_code=400, detail="Description is required")

    try:
        normalized_phone = parse_phone_number(body.phoneNumber)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        classify_started = time.perf_counter()
        classification = await asyncio.to_thread(
            classify_issue,
            body.imageBase64,
            description,
        )
        classify_elapsed = time.perf_counter() - classify_started
    except ValueError as exc:
        # Genuine bad input (e.g. empty description) — the user needs to know.
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        # AI classification is unavailable (bad/expired key, quota, network,
        # etc.) — never block a citizen's submission on this. Fall back to a
        # safe default classification and still save the submission.
        logger.warning("Gemini classification failed, using fallback: %s", exc)
        classification = default_classification()
        classify_elapsed = 0.0

    payload = {
        "submittedFor": body.submittedFor,
        "name": body.name.strip(),
        "role": body.role.strip(),
        "locality": body.locality.strip(),
        "topic": body.topic.strip(),
        "description": description,
        "imageBase64": body.imageBase64,
        "latitude": body.latitude if isinstance(body.latitude, (int, float)) else None,
        "longitude": body.longitude if isinstance(body.longitude, (int, float)) else None,
        **classification,
    }
    if normalized_phone:
        payload["phoneNumber"] = normalized_phone

    try:
        save_started = time.perf_counter()
        result = await asyncio.to_thread(save_submission, payload)
        save_elapsed = time.perf_counter() - save_started
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    submission_record = {
        "id": result["id"],
        **payload,
    }
    try:
        issue_id = await asyncio.to_thread(assign_to_issue, submission_record)
        logger.info("submission id=%s assigned to issue id=%s", result["id"], issue_id)
    except RuntimeError as exc:
        logger.warning("assign_to_issue failed for submission %s: %s", result["id"], exc)

    logger.info(
        "submission saved id=%s classify=%.2fs save=%.2fs",
        result["id"],
        classify_elapsed,
        save_elapsed,
    )

    return {"ok": True, "id": result["id"], **classification}


@app.get("/api/health")
async def health() -> dict[str, bool]:
    """Cheap endpoint the frontend pings to verify real backend reachability
    — navigator.onLine alone reports true even on a LAN with no real
    internet access, or when the backend itself is unreachable."""
    return {"ok": True}


@app.get("/api/submissions")
async def get_submissions() -> list[dict[str, Any]]:
    try:
        return await asyncio.to_thread(list_submissions)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc


@app.get("/api/submissions/themes")
async def get_submission_themes() -> list[dict[str, Any]]:
    """Return persisted issues shaped as dashboard themes."""
    try:
        return await asyncio.to_thread(issues_to_themes)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc


@app.get("/api/issues/heatmap")
async def get_issues_heatmap() -> dict[str, Any]:
    """Geo points for the insights heatmap (issues with valid lat/lng only)."""
    try:
        items = await asyncio.to_thread(issues_for_heatmap)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc
    return {"items": items}


@app.get("/api/issues/{issue_id}")
async def get_issue_endpoint(issue_id: str) -> dict[str, Any]:
    try:
        issue = await asyncio.to_thread(get_issue_detail, issue_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    resolved = await asyncio.to_thread(resolve_display_location, issue)
    if resolved:
        issue = {**issue, "locality": resolved}

    return issue


@app.get("/api/issues/{issue_id}/subscribers")
async def get_issue_subscribers_endpoint(
    issue_id: str,
    _: None = Depends(require_mp_api_key),
) -> list[dict[str, Any]]:
    try:
        return await asyncio.to_thread(get_subscribers, issue_id)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc


@app.patch("/api/issues/{issue_id}/status")
async def patch_issue_status_endpoint(
    issue_id: str,
    body: IssueStatusBody,
    _: None = Depends(require_mp_api_key),
) -> dict[str, Any]:
    try:
        before = await asyncio.to_thread(get_issue, issue_id)
        if not before:
            raise HTTPException(status_code=404, detail="Issue not found")

        updated = await asyncio.to_thread(
            patch_issue_status,
            issue_id,
            body.status,
            outcome=body.outcome,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    last_notified = before.get("lastNotifiedStatus")
    if body.status in NOTIFY_STATUSES and body.status != last_notified:
        await asyncio.to_thread(
            update_issue_status,
            issue_id,
            body.status,
            last_notified_status=body.status,
        )

    return {"ok": True, "issue": updated}


@app.get("/api/submissions/{submission_id}")
async def get_submission_endpoint(submission_id: str) -> dict[str, Any]:
    try:
        submission = await asyncio.to_thread(get_submission, submission_id)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    # Show the same readable location the dashboard resolves — when the citizen
    # only shared GPS coordinates, reverse-geocode them into a place name so the
    # detail page no longer reads "Location not provided".
    resolved = await asyncio.to_thread(resolve_display_location, submission)
    if resolved:
        submission = {**submission, "locality": resolved}

    return submission


async def _run_submission_analysis(
    submission_id: str,
    submission: dict[str, Any],
) -> dict[str, Any]:
    image_base64 = ""
    if submission.get("hasImage"):
        try:
            image_base64 = await asyncio.to_thread(get_submission_image, submission_id) or ""
        except RuntimeError:
            image_base64 = ""

    try:
        analysis_started = time.perf_counter()
        analysis = await asyncio.to_thread(
            analyze_issue,
            image_base64=image_base64,
            topic=str(submission.get("topic", "")),
            description=str(submission.get("description", "")),
            issue_type=str(submission.get("issueType", "")),
            severity=str(submission.get("severity", "")),
            ai_tags=submission.get("aiTags") if isinstance(submission.get("aiTags"), list) else [],
            locality=str(submission.get("locality", "")),
            submitted_for=str(submission.get("submittedFor", "")),
        )
        analysis_elapsed = time.perf_counter() - analysis_started
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.warning("Groq analysis failed, using fallback: %s", exc)
        analysis = default_analysis(
            description=str(submission.get("description", "")),
            issue_type=str(submission.get("issueType", "")),
            severity=str(submission.get("severity", "")),
            has_image=bool(submission.get("hasImage")),
        )
        analysis_elapsed = 0.0

    logger.info(
        "submission analysis id=%s elapsed=%.2fs",
        submission_id,
        analysis_elapsed,
    )

    return {"ok": True, "submissionId": submission_id, **analysis}


@app.get("/api/submissions/{submission_id}/analysis")
async def get_submission_analysis(submission_id: str) -> dict[str, Any]:
    try:
        submission = await asyncio.to_thread(get_submission, submission_id)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    return await _run_submission_analysis(submission_id, submission)


@app.post("/api/submissions/analyze")
async def analyze_submission(body: SubmissionAnalysisBody) -> dict[str, Any]:
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")

    submission = {
        "topic": body.topic.strip(),
        "description": body.description.strip(),
        "issueType": body.issueType.strip(),
        "severity": body.severity.strip(),
        "aiTags": body.aiTags,
        "locality": body.locality.strip(),
        "submittedFor": body.submittedFor.strip(),
        "hasImage": body.hasImage,
    }
    return await _run_submission_analysis(body.id.strip(), submission)


@app.get("/api/submissions/{submission_id}/image")
async def get_submission_image_endpoint(submission_id: str) -> dict[str, str | None]:
    try:
        image_base64 = await asyncio.to_thread(get_submission_image, submission_id)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message, firebase=True),
            detail=message,
        ) from exc

    if image_base64 is None:
        raise HTTPException(status_code=404, detail="Image not found")

    return {"imageBase64": image_base64}


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="No audio file provided")

    try:
        result = await asyncio.to_thread(
            transcribe_audio,
            content,
            file.content_type or "audio/webm",
            file.filename or "recording.webm",
        )
    except RuntimeError as exc:
        message = str(exc)
        status = 503 if "SARVAM_API_KEY" in message else 422
        raise HTTPException(status_code=status, detail=message) from exc

    return {
        "ok": True,
        "transcript": result["transcript"],
        "languageCode": result["language_code"],
    }


@app.post("/api/submit")
async def submit(body: SubmitBody) -> dict[str, Any]:
    if not body.rawText.strip():
        raise HTTPException(status_code=400, detail="Empty submission")

    try:
        return await asyncio.to_thread(submit_voice, body.model_dump())
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message),
            detail=message,
        ) from exc


@app.get("/api/clusters")
async def clusters() -> dict[str, Any]:
    try:
        return await asyncio.to_thread(get_clusters)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message),
            detail=message,
        ) from exc


@app.patch("/api/clusters/{cluster_id}")
async def patch_cluster(cluster_id: str, body: ClusterPatchBody) -> dict[str, Any]:
    try:
        return await asyncio.to_thread(
            act_on_cluster,
            cluster_id,
            body.model_dump(exclude_none=True),
        )
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message),
            detail=message,
        ) from exc


@app.get("/api/showcase")
async def showcase() -> dict[str, Any]:
    try:
        demo = await asyncio.to_thread(get_showcase)
        live_completed = await asyncio.to_thread(completed_issues_for_showcase)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message),
            detail=message,
        ) from exc

    demo_items = demo.get("items", []) if isinstance(demo, dict) else []
    if not isinstance(demo_items, list):
        demo_items = []
    items = [*demo_items, *live_completed]
    items.sort(key=lambda item: str(item.get("publishedAt") or ""), reverse=True)
    return {"items": items}
