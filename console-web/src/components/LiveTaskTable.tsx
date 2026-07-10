import { Bot, BrainCircuit, Braces, CodeXml, Cpu, Sparkles, Waves } from "lucide-react";

import { TaskSummary } from "../api/client";
import { formatTaskLabel, resultBrief, taskBrief, taskDuration } from "../taskPresentation";

export function LiveTaskTable({ tasks, onSelect }: { tasks: TaskSummary[]; onSelect: (taskId: string) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Task</th>
            <th>Route</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.task_id} onClick={() => onSelect(task.task_id)}>
              <td>
                  <span className={`status ${(task.display_status || task.status).toLowerCase()}`}>
                    {task.display_status || task.status}
                  </span>
                  {task.status_note && <small>{task.status_note}</small>}
                </td>
                <td>
                  <strong>{formatTaskLabel(task.task_id)}</strong>
                  <small className="task-brief">任务简报：{taskBrief(task.user_goal)}</small>
                  <small className="result-brief">结果简报：{resultBrief(task)}</small>
                </td>
              <td className="route-cell">
                <RouteIdentity kind="agent" value={task.route.worker} />
                <RouteIdentity kind="model" value={task.route.model} />
                {task.route.variant && <small className="route-variant">{task.route.variant}</small>}
              </td>
              <td>{taskDuration(task)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RouteIdentity({ kind, value }: { kind: "agent" | "model"; value?: string }) {
  const name = value || "pending";
  const normalized = name.toLowerCase();
  const Icon = kind === "agent"
    ? normalized.includes("claude") ? Braces : normalized.includes("opencode") ? CodeXml : Bot
    : normalized.includes("deepseek") ? Waves
    : normalized.includes("glm") ? BrainCircuit
    : normalized.includes("mimo") ? Cpu
    : normalized.includes("gpt") || normalized.includes("openai") ? Sparkles
    : Bot;
  const provider = kind === "agent" ? agentProvider(normalized) : modelProvider(normalized);
  const providerClass = `${kind}-${provider}`;

  return (
    <span className={`route-identity ${providerClass}`} title={`${provider} ${kind}`}>
      <Icon size={15} aria-hidden="true" />
      <span>{name}</span>
    </span>
  );
}

function agentProvider(value: string): string {
  if (value.includes("claude")) return "anthropic";
  if (value.includes("opencode")) return "opencode";
  if (value.includes("codex")) return "openai";
  return "generic";
}

function modelProvider(value: string): string {
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("glm")) return "zhipu";
  if (value.includes("mimo")) return "mimo";
  if (value.includes("gpt") || value.includes("openai")) return "openai";
  return "generic";
}
