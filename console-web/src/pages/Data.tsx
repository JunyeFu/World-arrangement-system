import { BarChart3, CheckCircle2, Clock3, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ConsoleSnapshot, MetricsQuality, MetricsUsage } from "../api/client";

export function Data({ snapshot }: { snapshot: ConsoleSnapshot }) {
  const [quality, setQuality] = useState<MetricsQuality | null>(null);
  const [usage, setUsage] = useState<MetricsUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.metricsQuality().then(setQuality).catch((err) => setError(err.message));
    api.metricsUsage().then(setUsage).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="metrics-page">
      <section className="panel metrics-summary-panel">
        <h2>Data</h2>
        <div className="summary-kpis">
          <DataKpi label="Attempts" value={snapshot.metrics.attempts.toString()} icon={<Gauge size={18} />} />
          <DataKpi label="Completed" value={snapshot.health.done.toString()} icon={<CheckCircle2 size={18} />} />
          <DataKpi label="P95 duration" value={formatDuration(snapshot.metrics.p95_duration_ms)} icon={<Clock3 size={18} />} />
          <DataKpi label="Models" value={snapshot.models.length.toString()} icon={<BarChart3 size={18} />} />
        </div>
      </section>
      <ModelData models={snapshot.models} />
      <QualityData quality={quality} error={error} />
      <UsageData usage={usage} />
    </div>
  );
}

function DataKpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="summary-kpi"><span>{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}

function ModelData({ models }: { models: ConsoleSnapshot["models"] }) {
  return (
    <section className="panel metrics-wide">
      <div className="panel-head"><h2>Model Performance</h2><span className="process-count">{models.length}</span></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Model</th><th>Worker</th><th>Attempts</th><th>Success rate</th></tr></thead>
          <tbody>
            {models.length === 0 && <tr><td colSpan={4}>No model data recorded yet</td></tr>}
            {models.map((model) => (
              <tr key={`${model.worker}-${model.model}`}>
                <td><code>{model.model || "unknown"}</code></td>
                <td>{model.worker || "unknown"}</td>
                <td>{model.attempts}</td>
                <td>{((model.success_rate ?? 0) * 100).toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function QualityData({ quality, error }: { quality: MetricsQuality | null; error: string | null }) {
  return (
    <section className="panel metrics-wide">
      <div className="panel-head"><h2>Quality Matrix</h2>{quality && <span className="process-count">{quality.summary.total}</span>}</div>
      {!quality ? <div className="empty-process">{error || "Loading quality metrics..."}</div> : (
        <div className="table-wrap quality-table">
          <table>
            <thead><tr><th>Task</th><th>Type</th><th>Route</th><th>Outcome</th><th>Quality</th><th>Changed</th></tr></thead>
            <tbody>
              {quality.rows.length === 0 && <tr><td colSpan={6}>No quality outcomes recorded yet</td></tr>}
              {quality.rows.slice(0, 12).map((row) => (
                <tr key={row.task_id}>
                  <td><code>{row.task_id}</code><small>{formatDateTime(row.completed_at)}</small></td>
                  <td>{row.task_type}<small>{row.risk_level}</small></td>
                  <td><code>{row.model || "unknown"}</code><small>{row.agent || "unknown"}</small></td>
                  <td>{row.outcome}<small>{row.terminal_status}</small></td>
                  <td>{row.quality_state}<small>{row.codex_rework_required ? "rework" : row.user_acceptance}</small></td>
                  <td>{row.changed_files_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UsageData({ usage }: { usage: MetricsUsage | null }) {
  return (
    <section className="panel metrics-wide">
      <div className="panel-head"><h2>Model Calls</h2>{usage && <span className="process-count">{usage.calls.length}</span>}</div>
      {!usage ? <div className="empty-process">Loading model calls...</div> : (
        <div className="table-wrap usage-table">
          <table>
            <thead><tr><th>Date</th><th>Model</th><th>Input</th><th>Output</th><th>Session</th></tr></thead>
            <tbody>
              {usage.calls.length === 0 && <tr><td colSpan={5}>No model calls recorded yet</td></tr>}
              {usage.calls.map((call) => (
                <tr key={`${call.task_id}-${call.attempt_no}`}>
                  <td>{formatDateTime(call.created_at)}</td>
                  <td><code>{call.model}</code></td>
                  <td>{call.input_tokens}</td>
                  <td>{call.output_tokens}</td>
                  <td><code>{call.session}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0 ms";
  if (ms < 1_000) return `${Math.round(ms)} ms`;
  const seconds = Math.round(ms / 1_000);
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
