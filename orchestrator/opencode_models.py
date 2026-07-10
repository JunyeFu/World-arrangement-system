from __future__ import annotations

import json
import re
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Any, Callable

from .command_utils import build_command, command_available, subprocess_cwd
from .constants import DEFAULT_OPENCODE_CMD


_ANSI_ESCAPE = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")
_MODEL_ID = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_CACHE_SECONDS = 15.0


@dataclass(frozen=True)
class OpenCodeEndpoint:
    side: str
    label: str
    command: str


class OpenCodeModelDiscovery:
    """Reads the public model catalog from each local OpenCode installation."""

    def __init__(
        self,
        *,
        runner: Callable[[str], tuple[int, str, str]] | None = None,
        now: Callable[[], float] = time.monotonic,
        cache_seconds: float = _CACHE_SECONDS,
    ) -> None:
        self._runner = runner or _run_models_command
        self._now = now
        self._cache_seconds = cache_seconds
        self._cached_at = 0.0
        self._cached: dict[str, Any] | None = None

    def snapshot(self, *, refresh: bool = False) -> dict[str, Any]:
        if not refresh and self._cached is not None and self._now() - self._cached_at < self._cache_seconds:
            return self._cached
        endpoints = (
            OpenCodeEndpoint("windows", "OpenCode Windows", "opencode.cmd"),
            OpenCodeEndpoint("wsl", "OpenCode WSL", DEFAULT_OPENCODE_CMD),
        )
        with ThreadPoolExecutor(max_workers=len(endpoints)) as executor:
            values = list(executor.map(self._discover_endpoint, endpoints))
        payload = {
            "refreshed_at": int(time.time()),
            "cache_seconds": int(self._cache_seconds),
            "endpoints": values,
        }
        self._cached_at = self._now()
        self._cached = payload
        return payload

    def _discover_endpoint(self, endpoint: OpenCodeEndpoint) -> dict[str, Any]:
        available, detail = command_available(endpoint.command)
        if not available:
            return _endpoint_payload(endpoint, detail=detail, models=[])
        code, stdout, stderr = self._runner(endpoint.command)
        if code != 0:
            return _endpoint_payload(
                endpoint,
                detail=_safe_error(stderr or stdout or f"opencode models exited {code}"),
                models=[],
            )
        return _endpoint_payload(endpoint, detail=detail, models=parse_opencode_models(stdout))


def parse_opencode_models(output: str) -> list[dict[str, Any]]:
    """Parse OpenCode's human-readable `models --verbose` stream safely."""
    clean = _ANSI_ESCAPE.sub("", output)
    lines = clean.splitlines()
    decoder = json.JSONDecoder()
    models: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, line in enumerate(lines):
        model_id = line.strip()
        if not _MODEL_ID.fullmatch(model_id) or model_id in seen:
            continue
        remainder = "\n".join(lines[index + 1:]).lstrip()
        if not remainder.startswith("{"):
            continue
        try:
            metadata, _ = decoder.raw_decode(remainder)
        except json.JSONDecodeError:
            continue
        if not isinstance(metadata, dict):
            continue
        seen.add(model_id)
        variants = metadata.get("variants")
        models.append({
            "id": model_id,
            "name": str(metadata.get("name") or metadata.get("id") or model_id),
            "status": str(metadata.get("status") or "unknown"),
            "variants": sorted(variants) if isinstance(variants, dict) else [],
            "context_limit": _int_value((metadata.get("limit") or {}).get("context")),
            "toolcall": bool((metadata.get("capabilities") or {}).get("toolcall")),
        })
    return models


def _run_models_command(command: str) -> tuple[int, str, str]:
    cmd = build_command(command, ["models", "--verbose"], cwd=None)
    try:
        proc = subprocess.run(
            cmd,
            cwd=subprocess_cwd(command, "."),
            env=None,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, "", str(exc)
    return proc.returncode, proc.stdout, proc.stderr


def _endpoint_payload(endpoint: OpenCodeEndpoint, *, detail: str, models: list[dict[str, Any]]) -> dict[str, Any]:
    preferred_provider = "agent-plan/" if endpoint.side == "windows" else "opencode-go/"
    models.sort(key=lambda model: (not str(model["id"]).startswith(preferred_provider), str(model["name"]).lower()))
    return {
        "side": endpoint.side,
        "label": endpoint.label,
        "available": bool(models),
        "detail": detail,
        "models": models,
    }


def _safe_error(value: str) -> str:
    return _ANSI_ESCAPE.sub("", value).strip()[:300]


def _int_value(value: Any) -> int | None:
    return int(value) if isinstance(value, int) else None


DEFAULT_OPENCODE_MODEL_DISCOVERY = OpenCodeModelDiscovery()
