# Architecture

## Layers

1. User speaks only to Codex.
2. Codex calls MCP tools on `ai_dispatcher`.
3. Orchestrator records task state in SQLite and artifacts under `~/.ai-orchestrator/runs`.
4. Router chooses a worker/model from task risk, task type, project stack, and history.
5. Worker edits only inside an isolated git worktree.
6. Verifier runs tests/build and generates `diff.patch`.
7. Reviewer gates publication.
8. Publisher creates a PR only when policy allows; V1 never merges.

## Data Flow

`task.json -> route.json -> worktree.json -> result.json -> verify/* -> review/review.json -> final.md`

SQLite stores indexes and state transitions. Large logs stay in artifacts.

## Provider Isolation

Claude Code-compatible providers such as DeepSeek and MiMo must not be selected by editing global `~/.claude/settings.json` during a task. V1 loads the selected model's `env_profile` from `models.yaml` and passes those variables only to the worker subprocess.

This makes concurrent provider execution safe:

- DeepSeek task: child process receives DeepSeek `ANTHROPIC_BASE_URL` and token.
- MiMo task: child process receives MiMo environment.
- Parent process and other tasks keep their own environment.

When Codex runs on Windows but workers live in WSL, command overrides such as `AI_CLAUDE_CMD="wsl -e claude"` are supported. The worker injects provider variables through `wsl -e env KEY=VALUE ...`.

Some Windows proxy clients return fake-IP addresses such as `198.18.*` to WSL. In that setup, declare `HTTP_PROXY` and `HTTPS_PROXY` in each affected local provider profile (for example, `http://127.0.0.1:7897`). World forwards those proxy values only to the selected worker. It never inherits proxy variables from the parent process, so provider isolation remains intact. A TLS handshake timeout after a successful Claude initialization event is an outbound-network failure and should be diagnosed before increasing a task timeout.

## Boundary Choice

This implementation uses the package name `orchestrator/` because `ORCHESTRATOR_FULL_PACK.md` specifies that executable layout. The research report's `ai_orchestrator/` name is treated as equivalent conceptually.
