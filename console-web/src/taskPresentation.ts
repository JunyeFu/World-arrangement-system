import { TaskSummary } from "./api/client";

const TASK_ID_PATTERN = /^t_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_([A-Za-z0-9]+)$/;
const SECTION_BOUNDARY = /\s*(?:验收(?:标准)?|安全约束|变更范围|交付(?:要求|物)?|输出(?:要求|格式)?|禁止(?:事项|操作)?|注意事项?)\s*[：:]|\s*不得/i;
const TEMPLATE_LINE = /^(?:project|mode|world_preflight|world_self_analysis|read_budget(?:\.[\w-]+)?|安全约束|验收标准)\s*[:：]/i;
const TEMPLATE_TEXT = /(?:请直接执行项目任务|不要分析 World 系统本身|不读取或输出\s*secret|不改\s*\.env|不自动\s*(?:merge|PR)|保护现有内容)/i;

export function formatTaskLabel(taskId: string): string {
  const match = TASK_ID_PATTERN.exec(taskId);
  if (!match) {
    return taskId;
  }
  const [, year, month, day, hour, minute, second, suffix] = match;
  return `${year}年${Number(month)}月${Number(day)}日 ${hour}：${minute}：${second} 任务${suffix}`;
}

export function taskBrief(userGoal: string): string {
  const source = normalize(userGoal);
  const labelled = /(?:任务目标|任务|目标)\s*[：:]\s*([\s\S]*)/i.exec(source)?.[1];
  const candidate = labelled || source;
  const boundaryIndex = candidate.search(SECTION_BOUNDARY);
  const specificGoal = boundaryIndex >= 0 ? candidate.slice(0, boundaryIndex) : candidate;
  const lines = specificGoal
    .split(/\n|(?<=。)|(?<=；)/)
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter((line) => line && !TEMPLATE_LINE.test(line) && !TEMPLATE_TEXT.test(line));
  return compact(lines.join(" ")) || "未提供任务目标";
}

export function resultBrief(task: Pick<TaskSummary, "result_summary" | "status_reason" | "status_note" | "display_status" | "status">): string {
  return compact(task.result_summary || task.status_reason || task.status_note || task.display_status || task.status)
    || "暂无执行结果";
}

export function taskDuration(task: Pick<TaskSummary, "created_at" | "updated_at" | "is_terminal">, now = Date.now()): string {
  const startedAt = Date.parse(task.created_at);
  if (Number.isNaN(startedAt)) {
    return "--";
  }
  const endedAt = task.is_terminal ? Date.parse(task.updated_at) : now;
  if (Number.isNaN(endedAt) || endedAt < startedAt) {
    return "--";
  }
  const seconds = Math.floor((endedAt - startedAt) / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = seconds % 60;
  if (minutes < 60) {
    return remainderSeconds ? `${minutes}m ${remainderSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainderMinutes = minutes % 60;
  return remainderMinutes ? `${hours}h ${remainderMinutes}m` : `${hours}h`;
}

function normalize(value: string): string {
  return value.replace(/\r\n?/g, "\n").replace(/[\t ]+/g, " ").trim();
}

function compact(value: string): string {
  const firstMeaningfulLine = normalize(value)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line && !TEMPLATE_TEXT.test(line)) || "";
  return firstMeaningfulLine.length > 180
    ? `${firstMeaningfulLine.slice(0, 177).trimEnd()}...`
    : firstMeaningfulLine;
}
