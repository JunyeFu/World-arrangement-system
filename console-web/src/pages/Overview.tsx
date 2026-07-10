import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { api, ConsoleSnapshot } from "../api/client";
import { HealthMetricKey, HealthStrip } from "../components/HealthStrip";
import { LiveTaskTable } from "../components/LiveTaskTable";
import { ProcessCards } from "../components/ProcessCards";
import { OpenCodeModels } from "../components/OpenCodeModels";

export function Overview({
  snapshot,
  onSelectTask,
  onRefresh
}: {
  snapshot: ConsoleSnapshot;
  onSelectTask: (taskId: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [selectedMetric, setSelectedMetric] = useState<HealthMetricKey>("running");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [recentTasksExpanded, setRecentTasksExpanded] = useState(true);
  const selectedTasks = useMemo(
    () => filterTasks(snapshot.tasks, selectedMetric),
    [snapshot, selectedMetric]
  );

  const dismissTask = async (taskId: string) => {
    setBusyTaskId(taskId);
    try {
      await api.dismissTask(taskId);
      await onRefresh();
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <>
      <HealthStrip snapshot={snapshot} selected={selectedMetric} onSelect={setSelectedMetric} />
      <ProcessCards
        group={selectedMetric}
        tasks={selectedTasks}
        alerts={snapshot.alerts}
        onSelectTask={onSelectTask}
        onDismissTask={(taskId) => {
          if (busyTaskId !== taskId) {
            void dismissTask(taskId);
          }
        }}
      />
      <OpenCodeModels catalog={snapshot.opencode} />
      {snapshot.alerts.length > 0 && (
        <section className="alerts">
          {snapshot.alerts.map((alert) => (
            <article key={alert.alert_id}>
              <AlertTriangle size={18} />
              <div>
                <strong>{alert.severity.toUpperCase()} · {alert.title}</strong>
                <small>{alert.message}</small>
              </div>
            </article>
          ))}
        </section>
      )}
      <section className="panel">
        <button
          className="panel-toggle"
          type="button"
          aria-expanded={recentTasksExpanded}
          onClick={() => setRecentTasksExpanded((current) => !current)}
        >
          <span className="panel-toggle-title">
            {recentTasksExpanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
            <span>Recent Tasks</span>
          </span>
          <small>{snapshot.tasks.length} tasks</small>
        </button>
        {recentTasksExpanded && <LiveTaskTable tasks={snapshot.tasks} onSelect={onSelectTask} />}
      </section>
    </>
  );
}

function filterTasks(tasks: ConsoleSnapshot["tasks"], metric: HealthMetricKey) {
  if (metric === "running") {
    return tasks.filter((task) => task.console_group === "running");
  }
  if (metric === "queued") {
    return tasks.filter((task) => task.console_group === "queued");
  }
  if (metric === "failed") {
    return tasks.filter((task) => task.console_group === "failed");
  }
  if (metric === "approval") {
    return tasks.filter((task) => task.console_group === "approval");
  }
  if (metric === "alerts") {
    return tasks.filter((task) => task.console_group === "alerts");
  }
  if (metric === "done") {
    return tasks.filter((task) => task.big_status === "Done");
  }
  return [];
}
