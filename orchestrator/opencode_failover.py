from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Any

from .env_profiles import model_spec
from .llm_capability import capability_profile, normalize_capability_tier


def annotate_opencode_attempt(attempt: dict[str, Any]) -> dict[str, Any]:
    """Add the execution side without changing non-OpenCode attempts."""
    value = dict(attempt)
    if value.get("worker") != "opencode":
        return value
    value["execution_side"] = execution_side(value)
    return value


def execution_side(attempt: dict[str, Any]) -> str:
    explicit = str(attempt.get("execution_side") or "").lower()
    if explicit in {"windows", "wsl"}:
        return explicit
    spec = model_spec(str(attempt.get("model") or ""))
    configured = str(spec.get("execution_side") or "").lower()
    if configured in {"windows", "wsl"}:
        return configured
    command = str(spec.get("worker_command") or "").lower()
    if command.startswith("wsl"):
        return "wsl"
    if command:
        return "windows"
    return "windows" if "windows" in str(attempt.get("model") or "").lower() else "wsl"


def counterpart_attempt(attempt: dict[str, Any]) -> dict[str, Any] | None:
    """Build the other local OpenCode GLM attempt for a quota failover."""
    if attempt.get("worker") != "opencode":
        return None
    source_side = execution_side(attempt)
    spec = model_spec(str(attempt.get("model") or ""))
    model = str(spec.get("failover_model") or "")
    if not model:
        model = "opencode_windows_coding_plan" if source_side == "wsl" else "opencode_go_glm52"
    target_side = "windows" if source_side == "wsl" else "wsl"
    variant = attempt.get("variant")
    intensity = attempt.get("intensity") or (variant if variant in {"high", "max"} else None)
    tier = normalize_capability_tier(variant if variant in {"high", "max"} else attempt.get("capability_tier"), intensity)
    return {
        "worker": "opencode",
        "model": model,
        "variant": variant,
        "intensity": intensity,
        "capability_tier": tier,
        "capability_profile": capability_profile(model, tier, intensity),
        "execution_side": target_side,
        "reason": f"OpenCode quota failover: {source_side} -> {target_side}",
        "status": "",
    }


def build_handoff_context(
    *,
    task_id: str,
    attempt: dict[str, Any],
    worker_result: Any,
    worktree: Path,
) -> dict[str, Any]:
    """Create the bounded, worker-safe context passed to the other side."""
    source_side = execution_side(attempt)
    changed_files = [str(path) for path in getattr(worker_result, "changed_files", [])][:200]
    return {
        "kind": "opencode_quota_failover",
        "task_id": task_id,
        "source_side": source_side,
        "source_model": str(attempt.get("model") or ""),
        "source_session_id": getattr(worker_result, "session_id", None),
        "prior_summary": str(getattr(worker_result, "summary", ""))[-4000:],
        "changed_files": changed_files,
        "diff_stat": _diff_stat(worktree),
        "continuation_rule": (
            "The same worktree contains the prior side's uncommitted progress. "
            "Inspect git diff first; preserve and extend that progress rather than reverting or starting over."
        ),
    }


def _diff_stat(worktree: Path) -> str:
    try:
        proc = subprocess.run(
            ["git", "-C", str(worktree), "diff", "--stat", "HEAD"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=15,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired):
        return ""
    return (proc.stdout or "").strip()[:4000]
