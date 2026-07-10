import { CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import { ConsoleSnapshot, TaskSummary } from "../api/client";

export function Done({ snapshot, onSelectTask }: { snapshot: ConsoleSnapshot; onSelectTask: (taskId: string) => void }) {
  const tasks = snapshot.tasks.filter((task) => task.big_status === "Done");
  const withPatch = tasks.filter((task) => task.status === "COMPLETED_WITH_PATCH").length;
  const noChanges = tasks.filter((task) => task.status === "COMPLETED_NO_CHANGES").length;

  return (
    <div className="metrics-page">
      <section className="panel metrics-summary-panel">
        <h2>Done</h2>
        <div className="summary-kpis">
          <DoneKpi label="Completed" value={snapshot.health.done.toString()} icon={<CheckCircle2 size={18} />} />
          <DoneKpi label="With patch" value={withPatch.toString()} icon={<FileCheck2 size={18} />} />
          <DoneKpi label="No changes" value={noChanges.toString()} icon={<Clock3 size={18} />} />
        </div>
      </section>
      <section className="panel metrics-wide">
        <div className="panel-head">
          <h2>Completed Tasks</h2>
          <span className="process-count">{tasks.length}</span>
        </div>
        <div className="table-wrap quality-table">
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>Result</th>
                <th>Route</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td colSpan={4}>No completed tasks recorded yet</td></tr>
              )}
              {tasks.map((task) => <DoneTaskRow key={task.task_id} task={task} onSelect={onSelectTask} />)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function DoneKpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="summary-kpi"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function DoneTaskRow({ task, onSelect }: { task: TaskSummary; onSelect: (taskId: string) => void }) {
  return (
    <tr onClick={() => onSelect(task.task_id)}>
      <td><strong>{task.user_goal || task.task_id}</strong><small>{task.task_id}</small></td>
      <td>{task.result_summary || task.status_note || task.status}<small>{task.display_status || task.status}</small></td>
      <td>{task.route.worker || "unknown"}<small>{task.route.model || "unknown"}</small></td>
      <td>{formatDateTime(task.updated_at)}</td>
    </tr>
  );
}

function formatDateTime(value: string) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}
