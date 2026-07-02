"""Fail fast if the backend port is already bound (avoids duplicate uvicorn on Windows)."""

from __future__ import annotations

import subprocess
import sys


def port_is_bound(port: int) -> list[str]:
    result = subprocess.run(
        ["netstat", "-ano"],
        capture_output=True,
        text=True,
        check=False,
    )
    needle = f":{port} "
    return [
        line.strip()
        for line in result.stdout.splitlines()
        if needle in line and "LISTENING" in line
    ]


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    listeners = port_is_bound(port)
    if not listeners:
        return 0

    print(f"ERROR: Port {port} is already in use. Stop the other backend before starting.", file=sys.stderr)
    for line in listeners:
        print(f"  {line}", file=sys.stderr)
    print(f"  Check: netstat -ano | findstr {port}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
