"""Save submissions to Firestore via the existing TypeScript bridge."""

from __future__ import annotations

import json
import os
import subprocess
import sys
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


def save_submission(payload: dict[str, Any]) -> dict[str, str]:
    command = [
        *_resolve_ts_node(),
        "src/firestore_bridge.ts",
    ]

    env = os.environ.copy()
    env.setdefault("NODE_OPTIONS", "--no-warnings")

    result = subprocess.run(
        command,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=str(BACKEND_DIR),
        check=False,
        env=env,
    )

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "Firestore save failed"
        raise RuntimeError(detail)

    data = json.loads(result.stdout)
    if "error" in data:
        raise RuntimeError(data["error"])

    return {"id": data["id"]}
