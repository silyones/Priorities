"""FastAPI backend — port 3001."""

from __future__ import annotations

import os
from typing import Any, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from firestore_service import get_submission_image, list_submissions, save_submission
from gemini_service import classify_issue

load_dotenv()

PORT = int(os.getenv("PORT", "3001"))
EXPRESS_INTERNAL_PORT = int(os.getenv("EXPRESS_INTERNAL_PORT", "3002"))
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
MP_FRONTEND_ORIGIN = os.getenv("MP_FRONTEND_ORIGIN", "http://localhost:3002")
EXPRESS_BASE = f"http://127.0.0.1:{EXPRESS_INTERNAL_PORT}"

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        f"{FRONTEND_ORIGIN},{MP_FRONTEND_ORIGIN}",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title="People's Priorities API")

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


@app.post("/api/submissions")
async def create_submission(body: SubmissionBody) -> dict[str, Any]:
    if not body.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
    if body.submittedFor not in ("myself", "someone_else"):
        raise HTTPException(status_code=400, detail="Invalid submittedFor value")

    try:
        classification = classify_issue(body.imageBase64, body.description)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        message = str(exc)
        status = 503 if "GEMINI_API_KEY" in message else 502
        raise HTTPException(status_code=status, detail=message) from exc

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
        result = save_submission(payload)
    except RuntimeError as exc:
        message = str(exc)
        status = 503 if "Firebase" in message else 500
        raise HTTPException(status_code=status, detail=message) from exc

    return {"ok": True, "id": result["id"], **classification}


@app.get("/api/submissions")
async def get_submissions() -> list[dict[str, Any]]:
    try:
        return list_submissions()
    except RuntimeError as exc:
        message = str(exc)
        status = 503 if "Firebase" in message else 500
        raise HTTPException(status_code=status, detail=message) from exc


@app.get("/api/submissions/{submission_id}/image")
async def get_submission_image_endpoint(submission_id: str) -> dict[str, str | None]:
    try:
        image_base64 = get_submission_image(submission_id)
    except RuntimeError as exc:
        message = str(exc)
        status = 503 if "Firebase" in message else 500
        raise HTTPException(status_code=status, detail=message) from exc

    if image_base64 is None:
        raise HTTPException(status_code=404, detail="Image not found")

    return {"imageBase64": image_base64}


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="No audio file provided")

        files = {
            "file": (
                file.filename or "recording.webm",
                content,
                file.content_type or "audio/webm",
            )
        }
        response = await client.post(f"{EXPRESS_BASE}/api/transcribe", files=files)

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Transcription proxy failed") from exc

    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=data.get("error", "Transcription failed"))

    return data


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PATCH", "PUT", "DELETE"])
async def proxy_to_express(path: str, request: Request) -> Any:
    if path == "submissions" or path.startswith("submissions/"):
        raise HTTPException(status_code=404, detail="Not found")

    url = f"{EXPRESS_BASE}/api/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    body = await request.body()
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in {"host", "content-length"}
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.request(
            request.method,
            url,
            content=body if body else None,
            headers=headers,
        )

    return Response(
        content=response.content,
        status_code=response.status_code,
        media_type=response.headers.get("content-type"),
    )
