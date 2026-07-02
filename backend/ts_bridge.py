"""Persistent TypeScript bridge worker (avoids cold-start per request)."""

from __future__ import annotations

import json
import os
import subprocess
import threading
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parent

LARGE_PAYLOAD_BYTES = 400_000

_worker_lock = threading.Lock()
_worker_proc: subprocess.Popen[str] | None = None


def _resolve_ts_node() -> list[str]:
    candidates = [
        BACKEND_DIR / "node_modules" / "ts-node" / "dist" / "bin.js",
        BACKEND_DIR.parent / "node_modules" / "ts-node" / "dist" / "bin.js",
    ]
    for candidate in candidates:
        if candidate.exists():
            return ["node", str(candidate)]
    return ["npx", "ts-node"]


def _drain_stderr(proc: subprocess.Popen[str]) -> None:
    """Prevent stderr pipe backpressure from blocking the worker."""
    if proc.stderr is None:
        return
    for _ in proc.stderr:
        pass


def _start_worker() -> subprocess.Popen[str]:
    env = os.environ.copy()
    env.setdefault("NODE_OPTIONS", "--no-warnings")

    proc = subprocess.Popen(
        [*_resolve_ts_node(), "src/bridge_worker.ts"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        cwd=str(BACKEND_DIR),
        env=env,
        bufsize=1,
    )
    threading.Thread(target=_drain_stderr, args=(proc,), daemon=True).start()
    return proc


def _ensure_worker() -> subprocess.Popen[str]:
    global _worker_proc

    if _worker_proc is None or _worker_proc.poll() is not None:
        _worker_proc = _start_worker()
    return _worker_proc


def warm_bridge() -> None:
    """Pre-start the worker so the first user request is fast."""
    bridge_call({"action": "ping"})


def bridge_call(request: dict[str, Any]) -> Any:
    payload_path: str | None = None
    wire_request = request

    if request.get("action") == "firestore:save" and "payload" in request:
        encoded = json.dumps(request)
        if len(encoded) > LARGE_PAYLOAD_BYTES:
            import tempfile

            fd, payload_path = tempfile.mkstemp(suffix=".json", dir=str(BACKEND_DIR))
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                json.dump(request["payload"], handle)
            wire_request = {"action": "firestore:save", "payloadPath": payload_path}

    with _worker_lock:
        proc = _ensure_worker()
        assert proc.stdin is not None
        assert proc.stdout is not None

        try:
            proc.stdin.write(json.dumps(wire_request) + "\n")
            proc.stdin.flush()

            line = proc.stdout.readline()
            global _worker_proc
            if not line:
                _worker_proc = None
                raise RuntimeError("Bridge worker exited unexpectedly")

            data = json.loads(line)
            if not data.get("ok"):
                raise RuntimeError(data.get("error") or "Bridge request failed")
            return data["result"]
        finally:
            if payload_path and os.path.exists(payload_path):
                os.unlink(payload_path)
