"""Kill processes bound to a port (and stale dev orphans) before starting dev."""

from __future__ import annotations

import argparse
import socket
import subprocess
import sys
import time

DEFAULT_PORTS = [3000, 3001, 3002]


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


def process_exists(pid: int) -> bool:
    result = subprocess.run(
        ["tasklist", "/FI", f"PID eq {pid}", "/NH"],
        capture_output=True,
        text=True,
        check=False,
    )
    return str(pid) in result.stdout


def kill_pid(pid: int) -> bool:
    result = subprocess.run(
        ["taskkill", "/PID", str(pid), "/F", "/T"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.returncode == 0


def _powershell_pids(filter_script: str) -> list[int]:
    result = subprocess.run(
        ["powershell", "-NoProfile", "-Command", filter_script],
        capture_output=True,
        text=True,
        check=False,
    )
    pids: list[int] = []
    for line in result.stdout.splitlines():
        line = line.strip()
        if line.isdigit():
            pids.append(int(line))
    return pids


def kill_stale_bridge_workers() -> list[int]:
    script = (
        "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | "
        "Where-Object { $_.CommandLine -like '*bridge_worker.ts*' } | "
        "Select-Object -ExpandProperty ProcessId"
    )
    killed: list[int] = []
    for pid in _powershell_pids(script):
        if kill_pid(pid):
            killed.append(pid)
    return killed


def kill_stale_uvicorn(port: int | None = None) -> list[int]:
    port_filter = f" -and $_.CommandLine -like '*{port}*'" if port else ""
    script = (
        "Get-CimInstance Win32_Process -Filter \"name='python.exe'\" | "
        f"Where-Object {{ $_.CommandLine -like '*uvicorn*'{port_filter} }} | "
        "Select-Object -ExpandProperty ProcessId"
    )
    killed: list[int] = []
    for pid in _powershell_pids(script):
        if kill_pid(pid):
            killed.append(pid)
    return killed


def kill_next_dev(port: int) -> list[int]:
    script = (
        "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | "
        f"Where-Object {{ $_.CommandLine -like '*next dev*' -and $_.CommandLine -like '*{port}*' }} | "
        "Select-Object -ExpandProperty ProcessId"
    )
    killed: list[int] = []
    for pid in _powershell_pids(script):
        if kill_pid(pid):
            killed.append(pid)
    return killed


def kill_concurrently() -> list[int]:
    script = (
        "Get-CimInstance Win32_Process -Filter \"name='node.exe'\" | "
        "Where-Object { $_.CommandLine -like '*concurrently*' } | "
        "Select-Object -ExpandProperty ProcessId"
    )
    killed: list[int] = []
    for pid in _powershell_pids(script):
        if kill_pid(pid):
            killed.append(pid)
    return killed


def loopback_port_free(port: int) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            if sys.platform == "win32":
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
            sock.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False


def clear_port(port: int, *, aggressive: bool = False) -> dict[str, list[int]]:
    killed: dict[str, list[int]] = {
        "listeners": [],
        "uvicorn": [],
        "next": [],
        "bridge": [],
        "concurrently": [],
    }

    for _ in range(3 if aggressive else 1):
        killed["listeners"].extend(
            pid for pid in listener_pids(port) if kill_pid(pid)
        )
        killed["uvicorn"].extend(kill_stale_uvicorn(port))
        killed["next"].extend(kill_next_dev(port))
        if aggressive:
            time.sleep(0.4)

    if aggressive:
        killed["bridge"].extend(kill_stale_bridge_workers())
        killed["concurrently"].extend(kill_concurrently())

    return killed


def report(port: int, killed: dict[str, list[int]]) -> None:
    if killed["listeners"]:
        print(f"Cleared port {port} listeners: {sorted(set(killed['listeners']))}")
    if killed["uvicorn"]:
        print(f"Cleared uvicorn on {port}: {sorted(set(killed['uvicorn']))}")
    if killed["next"]:
        print(f"Cleared next dev on {port}: {sorted(set(killed['next']))}")
    if killed["bridge"]:
        print(f"Cleared stale bridge workers: {sorted(set(killed['bridge']))}")
    if killed["concurrently"]:
        print(f"Cleared concurrently: {sorted(set(killed['concurrently']))}")

    remaining = listener_pids(port)
    zombies = [pid for pid in remaining if not process_exists(pid)]
    live = [pid for pid in remaining if process_exists(pid)]

    if zombies:
        print(
            f"Note: port {port} shows ghost entries {zombies} in netstat "
            f"(dead PIDs). Backend uses 127.0.0.1:{port} to bypass them.",
            file=sys.stderr,
        )
    if live:
        print(
            f"WARNING: port {port} still held by live PIDs {live}.",
            file=sys.stderr,
        )
    elif loopback_port_free(port):
        print(f"Port {port} is free on 127.0.0.1")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("port", nargs="?", type=int, default=3001)
    parser.add_argument(
        "--all",
        action="store_true",
        help="Kill all dev ports (3000–3002) and orphan processes",
    )
    args = parser.parse_args()

    ports = DEFAULT_PORTS if args.all else [args.port]
    aggressive = args.all

    for port in ports:
        killed = clear_port(port, aggressive=aggressive)
        report(port, killed)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
