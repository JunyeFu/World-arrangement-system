from __future__ import annotations

from orchestrator.opencode_models import OpenCodeModelDiscovery, parse_opencode_models


def test_parse_opencode_models_returns_public_model_metadata() -> None:
    output = """\
\x1b[31magent-plan/glm-5-2-260617\x1b[0m
{
  "id": "glm-5-2-260617",
  "name": "GLM 5.2",
  "status": "active",
  "limit": {"context": 200000},
  "capabilities": {"toolcall": true},
  "variants": {"high": {}, "max": {}}
}
opencode-go/glm-5.2
{
  "id": "glm-5.2",
  "name": "GLM-5.2",
  "status": "active",
  "limit": {"context": 1000000},
  "capabilities": {"toolcall": true},
  "variants": {"high": {}}
}
"""

    assert parse_opencode_models(output) == [
        {
            "id": "agent-plan/glm-5-2-260617",
            "name": "GLM 5.2",
            "status": "active",
            "variants": ["high", "max"],
            "context_limit": 200000,
            "toolcall": True,
        },
        {
            "id": "opencode-go/glm-5.2",
            "name": "GLM-5.2",
            "status": "active",
            "variants": ["high"],
            "context_limit": 1000000,
            "toolcall": True,
        },
    ]


def test_discovery_caches_models_for_bounded_console_refresh(monkeypatch) -> None:
    calls: list[str] = []
    clock = [10.0]

    def runner(command: str):
        calls.append(command)
        model = "agent-plan/glm-5-2-260617" if command == "opencode.cmd" else "opencode-go/glm-5.2"
        return 0, f'{model}\n{{"name":"GLM","status":"active"}}', ""

    monkeypatch.setattr("orchestrator.opencode_models.command_available", lambda command: (True, command))
    discovery = OpenCodeModelDiscovery(runner=runner, now=lambda: clock[0], cache_seconds=15)

    first = discovery.snapshot()
    second = discovery.snapshot()
    clock[0] = 26.0
    third = discovery.snapshot()

    assert len(calls) == 4
    assert first is second
    assert third is not first
    assert [item["side"] for item in first["endpoints"]] == ["windows", "wsl"]
