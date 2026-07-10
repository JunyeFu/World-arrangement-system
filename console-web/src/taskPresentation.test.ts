import { describe, expect, it } from "vitest";

import { formatTaskLabel, resultBrief, taskBrief, taskDuration } from "./taskPresentation";

describe("task presentation", () => {
  it("formats World task identifiers as a readable local label", () => {
    expect(formatTaskLabel("t_20260701_151128_38ef37")).toBe("2026年7月1日 15：11：28 任务38ef37");
    expect(formatTaskLabel("task_console")).toBe("task_console");
  });

  it("keeps the specific task goal and removes World prompt boilerplate", () => {
    const goal = "project: world_system mode: execute world_preflight: minimal 请求直接执行 World 系统项目任务，不要分析 World 系统本身。任务：只变更 446385c 的修复结果，重启验证后不再创建 PR。验收标准：测试通过。安全约束：不读取或输出 secrets。";

    expect(taskBrief(goal)).toBe("只变更 446385c 的修复结果，重启验证后不再创建 PR。");
  });

  it("removes generic execution constraints after the specific goal", () => {
    const goal = "任务：执行 mimo_v25 的真实 Claude Code 连通性测试。严格只读：读取 pyproject.toml 的项目名称。不得修改文件、运行测试、提交、推送或创建 PR。验收：必须使用实际 worker。";

    expect(taskBrief(goal)).toBe("执行 mimo_v25 的真实 Claude Code 连通性测试。 严格只读：读取 pyproject.toml 的项目名称。");
  });

  it("uses the result summary before a status fallback", () => {
    expect(resultBrief({ result_summary: "已完成接口验证并通过测试", status: "DONE" })).toBe("已完成接口验证并通过测试");
    expect(resultBrief({ status_reason: "worker timed out", status: "FAILED" })).toBe("worker timed out");
  });

  it("shows terminal and active task durations", () => {
    expect(taskDuration({
      created_at: "2026-07-10T10:00:00Z",
      updated_at: "2026-07-10T10:01:32Z",
      is_terminal: true,
    })).toBe("1m 32s");
    expect(taskDuration({
      created_at: "2026-07-10T10:00:00Z",
      updated_at: "2026-07-10T10:00:10Z",
      is_terminal: false,
    }, Date.parse("2026-07-10T11:15:00Z"))).toBe("1h 15m");
  });
});
