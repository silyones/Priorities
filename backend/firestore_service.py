"""Firestore access via the existing TypeScript client setup."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parent


def _resolve_ts_node() -> list[str]:
    candidates = [
        BACKEND_DIR / "node_modules" / "ts-node" / "dist" / "bin.js",
        BACKEND_DIR.parent / "node_modules" / "ts-node" / "dist" / "bin.js",
    ]
    for candidate in candidates:
        if candidate.exists():
            return ["node", str(candidate)]

    return ["npx", "ts-node"]


def _run_ts_bridge(script: str, payload: dict[str, Any] | None = None) -> Any:
    import subprocess

    command = [*_resolve_ts_node(), script]
    env = os.environ.copy()
    env.setdefault("NODE_OPTIONS", "--no-warnings")

    result = subprocess.run(
        command,
        input=json.dumps(payload) if payload is not None else None,
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
        check=False,
        env=env,
    )

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "Firestore request failed"
        raise RuntimeError(detail)

    data = json.loads(result.stdout)
    if isinstance(data, dict) and "error" in data:
        raise RuntimeError(data["error"])

    return data


def save_submission(payload: dict[str, Any]) -> dict[str, str]:
    data = _run_ts_bridge("src/firestore_bridge.ts", payload)
    return {"id": data["id"]}


def list_submissions() -> list[dict[str, Any]]:
    data = _run_ts_bridge("src/firestore_list_bridge.ts")
    if not isinstance(data, list):
        raise RuntimeError("Unexpected Firestore list response")
    return data


def get_submission_image(submission_id: str) -> str | None:
    data = _run_ts_bridge("src/firestore_image_bridge.ts", {"id": submission_id})
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected Firestore image response")
    image = data.get("imageBase64")
    return image if isinstance(image, str) and image.strip() else None
