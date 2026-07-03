"""Run backend on 127.0.0.1 only — avoids Windows ghost 0.0.0.0 listeners."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PORT = int(os.getenv("PORT", "3001"))
HOST = "127.0.0.1"


def port_available(host: str, port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sys.platform == "win32":
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            sock.bind((host, port))
        return True
    except OSError:
        return False


def wait_for_port(host: str, port: int, timeout: float = 20.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_available(host, port):
            return True
        time.sleep(0.5)
    return False


def uvicorn_cmd() -> list[str]:
    return [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--host",
        HOST,
        "--port",
        str(PORT),
    ]


def serve(_changes: set | None = None) -> None:
    subprocess.run(uvicorn_cmd(), cwd=str(BACKEND_DIR), check=False)


def main() -> int:
    kill = subprocess.run(
        [sys.executable, "scripts/kill_port.py", str(PORT)],
        cwd=str(BACKEND_DIR),
        check=False,
    )
    if kill.returncode != 0:
        return kill.returncode

    if not wait_for_port(HOST, PORT):
        print(
            f"ERROR: {HOST}:{PORT} is still in use after cleanup.\n"
            "Run from repo root: npm run stop\n"
            "If that fails, close all terminals or reboot once.",
            file=sys.stderr,
        )
        return 1

    os.chdir(BACKEND_DIR)
    print(f"Backend -> http://{HOST}:{PORT}")

    try:
        from watchfiles import PythonFilter, run_process

        run_process(
            str(BACKEND_DIR),
            target=serve,
            watch_filter=PythonFilter(),
        )
    except ImportError:
        return subprocess.run(uvicorn_cmd(), cwd=str(BACKEND_DIR)).returncode

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
