from __future__ import annotations

from orchestrator.opencode_failover import annotate_opencode_attempt, build_handoff_context, counterpart_attempt
from orchestrator.worker_prompt import build_worker_prompt
from orchestrator.workers.base import WorkerResult


def test_wsl_attempt_fails_over_to_windows_model(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    (home / "models.yaml").write_text(
        "models:\n"
        "  opencode_go_glm52:\n"
        "    execution_side: wsl\n"
        "    failover_model: opencode_windows_coding_plan\n"
        "  opencode_windows_coding_plan:\n"
        "    execution_side: windows\n",
        encoding="utf-8",
    )
    monkeypatch.setenv("AI_ORCHESTRATOR_HOME", str(home))

    source = annotate_opencode_attempt({"worker": "opencode", "model": "opencode_go_glm52", "variant": "high"})
    target = counterpart_attempt(source)

    assert source["execution_side"] == "wsl"
    assert target is not None
    assert target["execution_side"] == "windows"
    assert target["model"] == "opencode_windows_coding_plan"
    assert target["variant"] == "high"
    assert target["capability_tier"] == "high"


def test_handoff_context_keeps_progress_without_copying_a_raw_diff(tmp_path):
    result = WorkerResult(
        status="failed",
        summary="Implemented the parser; remaining work is tests.",
        changed_files=["src/parser.py"],
        session_id="ses_source",
    )

    handoff = build_handoff_context(
        task_id="t_failover",
        attempt={"worker": "opencode", "model": "opencode_go_glm52", "execution_side": "wsl"},
        worker_result=result,
        worktree=tmp_path,
    )

    assert handoff["source_side"] == "wsl"
    assert handoff["source_session_id"] == "ses_source"
    assert handoff["changed_files"] == ["src/parser.py"]
    assert "git diff first" in handoff["continuation_rule"]


def test_opencode_handoff_is_injected_into_continuation_prompt():
    prompt = build_worker_prompt(
        {
            "user_goal": "Finish parser tests",
            "task_mode": "patch",
            "expected_diff": True,
            "opencode_handoff": {
                "source_side": "wsl",
                "prior_summary": "Parser implementation is complete; tests remain.",
            },
        },
        {"selected_worker": "opencode", "selected_model": "opencode_windows_coding_plan"},
        task_requires_diff=lambda task: True,
    )

    assert "Cross-Side OpenCode Continuation" in prompt
    assert "Do not discard, revert, or duplicate" in prompt
