"""Kill processes bound to a port (and stale bridge workers) before starting dev."""

from __future__ import annotations

import subprocess
import sys

def port_listeners(port: int) -> list[str]:
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


def listener_pids(port: int) -> list[int]:
    pids: set[int] = set()
    for line in port_listeners(port):
        parts = line.split()
        if not parts:
            continue
        try:
            pid = int(parts[-1])
        except ValueError:
            continue
        if pid > 0:
            pids.add(pid)
    return sorted(pids)


def kill_pid(pid: int) -> bool:
    result = subprocess.run(
        ["taskkill", "/PID", str(pid), "/F"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def kill_stale_bridge_workers() -> list[int]:
    """Orphan node bridge_worker.ts processes survive uvicorn reload/kill on Windows."""
    script = (
        "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | "
        "Where-Object { $_.CommandLine -like '*bridge_worker.ts*' } | "
        "Select-Object -ExpandProperty ProcessId"
    )
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", script],
        capture_output=True,
        text=True,
        check=False,
    )
    killed: list[int] = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if not line.isdigit():
            continue
        pid = int(line)
        if kill_pid(pid):
            killed.append(pid)
    return killed


def main() -> int:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001

    killed_ports = [pid for pid in listener_pids(port) if kill_pid(pid)]
    killed_workers = kill_stale_bridge_workers()

    if killed_ports:
        print(f"Cleared port {port} listeners: {killed_ports}")
    if killed_workers:
        print(f"Cleared stale bridge workers: {killed_workers}")
    if not killed_ports and not killed_workers:
        print(f"Port {port} is free")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
