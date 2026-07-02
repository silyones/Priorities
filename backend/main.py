"""FastAPI backend — port 3001 (single source of truth)."""

from __future__ import annotations

import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from firestore_service import get_submission_image, list_submissions, save_submission
from gemini_service import classify_issue, default_classification
from sarvam_service import transcribe_audio
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


class SubmissionBody(BaseModel):
    submittedFor: Literal["myself", "someone_else"]
    name: str = ""
    role: str = ""
    locality: str = ""
    topic: str = ""
    description: str
    imageBase64: str = ""
    latitude: float | None = None
    longitude: float | None = None


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
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
    if body.submittedFor not in ("myself", "someone_else"):
        raise HTTPException(status_code=400, detail="Invalid submittedFor value")

    try:
        classify_started = time.perf_counter()
        classification = await asyncio.to_thread(
            classify_issue,
            body.imageBase64,
            body.description,
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
        "description": body.description.strip(),
        "imageBase64": body.imageBase64,
        "latitude": body.latitude if isinstance(body.latitude, (int, float)) else None,
        "longitude": body.longitude if isinstance(body.longitude, (int, float)) else None,
        **classification,
    }

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

    logger.info(
        "submission saved id=%s classify=%.2fs save=%.2fs",
        result["id"],
        classify_elapsed,
        save_elapsed,
    )

    return {"ok": True, "id": result["id"], **classification}


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
        return await asyncio.to_thread(get_showcase)
    except RuntimeError as exc:
        message = str(exc)
        raise HTTPException(
            status_code=_runtime_error_status(message),
            detail=message,
        ) from exc
