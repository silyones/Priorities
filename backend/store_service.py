"""In-memory cluster store via the persistent TypeScript bridge worker."""

from __future__ import annotations

from typing import Any

from ts_bridge import bridge_call


def get_clusters() -> dict[str, Any]:
    return bridge_call({"action": "store:clusters"})


def get_showcase() -> dict[str, Any]:
    return bridge_call({"action": "store:showcase"})


def submit_voice(payload: dict[str, Any]) -> dict[str, Any]:
    return bridge_call({"action": "store:submit", "payload": payload})


def act_on_cluster(cluster_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return bridge_call(
        {"action": "store:actOnCluster", "id": cluster_id, "payload": payload}
    )
