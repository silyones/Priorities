"""Stop all People's Priorities dev servers (ports 3000–3002 + orphans)."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KILL_PORT = ROOT / "backend" / "scripts" / "kill_port.py"


def main() -> int:
    subprocess.run(
        [sys.executable, str(KILL_PORT), "3001", "--all"],
        cwd=str(ROOT / "backend"),
        check=False,
    )
    print("Dev servers stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
