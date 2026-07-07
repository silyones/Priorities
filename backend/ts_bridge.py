"""Persistent TypeScript bridge worker (avoids cold-start per request)."""

from __future__ import annotations

import json
import logging
import os
import queue
import subprocess
import threading
from pathlib import Path
from typing import Any

BACKEND_DIR = Path(__file__).resolve().parent

LARGE_PAYLOAD_BYTES = 400_000
BRIDGE_TIMEOUT_SEC = int(os.getenv("BRIDGE_TIMEOUT_SEC", "60"))

_worker_lock = threading.Lock()
_worker_proc: subprocess.Popen[str] | None = None

logger = logging.getLogger("priorities.bridge")


def _resolve_worker_cmd() -> list[str]:
    """Prefer precompiled JS on Railway; fall back to ts-node for local dev."""
    compiled = BACKEND_DIR / "dist" / "bridge_worker.js"
    if compiled.exists():
        return ["node", str(compiled)]

    candidates = [
        BACKEND_DIR / "node_modules" / "ts-node" / "dist" / "bin.js",
        BACKEND_DIR.parent / "node_modules" / "ts-node" / "dist" / "bin.js",
    ]
    for candidate in candidates:
        if candidate.exists():
            return ["node", str(candidate), str(BACKEND_DIR / "src" / "bridge_worker.ts")]
    return ["npx", "ts-node", str(BACKEND_DIR / "src" / "bridge_worker.ts")]


def _log_stderr(proc: subprocess.Popen[str]) -> None:
    """Log worker stderr so Firestore/Admin failures are visible in Railway logs."""
    if proc.stderr is None:
        return
    for line in proc.stderr:
        text = line.rstrip()
        if text:
            logger.error("bridge worker stderr: %s", text)


def _start_worker() -> subprocess.Popen[str]:
    env = os.environ.copy()
    env.setdefault("NODE_OPTIONS", "--no-warnings")
    env.setdefault("FIRESTORE_PREFER_REST", "true")

    proc = subprocess.Popen(
        _resolve_worker_cmd(),
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
    threading.Thread(target=_log_stderr, args=(proc,), daemon=True).start()
    return proc


def _ensure_worker() -> subprocess.Popen[str]:
    global _worker_proc

    if _worker_proc is None or _worker_proc.poll() is not None:
        _worker_proc = _start_worker()
    return _worker_proc


def warm_bridge() -> None:
    """Pre-start the worker so the first user request is fast."""
    bridge_call({"action": "ping"})


def _reset_worker() -> None:
    global _worker_proc
    if _worker_proc is None:
        return
    try:
        _worker_proc.kill()
    except OSError:
        pass
    _worker_proc = None


def _readline_with_timeout(proc: subprocess.Popen[str], timeout_sec: int) -> str:
    assert proc.stdout is not None
    result: queue.Queue[str | None] = queue.Queue(maxsize=1)

    def _reader() -> None:
        try:
            result.put(proc.stdout.readline())  # type: ignore[union-attr]
        except Exception:
            result.put("")

    thread = threading.Thread(target=_reader, daemon=True)
    thread.start()
    try:
        line = result.get(timeout=timeout_sec)
    except queue.Empty as exc:
        _reset_worker()
        raise RuntimeError(
            f"Bridge worker timed out after {timeout_sec}s "
            f"(action may be stuck in Firestore/Admin SDK)"
        ) from exc
    return line or ""


def _bridge_call_once(wire_request: dict[str, Any], payload_path: str | None) -> Any:
    proc = _ensure_worker()
    assert proc.stdin is not None

    proc.stdin.write(json.dumps(wire_request) + "\n")
    proc.stdin.flush()

    line = _readline_with_timeout(proc, BRIDGE_TIMEOUT_SEC)
    if not line:
        _reset_worker()
        raise RuntimeError("Bridge worker exited unexpectedly")

    data = json.loads(line)
    if not data.get("ok"):
        raise RuntimeError(data.get("error") or "Bridge request failed")
    return data["result"]


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

    try:
        with _worker_lock:
            try:
                return _bridge_call_once(wire_request, payload_path)
            except (RuntimeError, json.JSONDecodeError):
                _reset_worker()
                return _bridge_call_once(wire_request, payload_path)
    finally:
        if payload_path and os.path.exists(payload_path):
            os.unlink(payload_path)
