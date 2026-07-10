import { Activity, AlertTriangle, CheckCircle2, Clock, ListChecks, ShieldAlert } from "lucide-react";
import { ConsoleSnapshot } from "../api/client";

export type HealthMetricKey = "running" | "queued" | "failed" | "approval" | "alerts" | "done";

export function HealthStrip({
  snapshot,
  selected,
  onSelect
}: {
  snapshot: ConsoleSnapshot;
  selected: HealthMetricKey;
  onSelect: (key: HealthMetricKey) => void;
}) {
  const items = [
    { key: "running" as const, label: "Running", value: snapshot.health.running, icon: Activity },
    { key: "queued" as const, label: "Queued", value: snapshot.health.queued, icon: Clock },
    { key: "failed" as const, label: "Failed", value: snapshot.health.failed, icon: ShieldAlert },
    { key: "approval" as const, label: "Approval", value: snapshot.health.approval_waiting, icon: ListChecks },
    { key: "alerts" as const, label: "Alerts", value: snapshot.health.open_alerts, icon: AlertTriangle },
    { key: "done" as const, label: "Done", value: snapshot.health.done, icon: CheckCircle2 }
  ];

  return (
    <section className="health-strip" aria-label="System health filters">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={`metric ${selected === item.key ? "selected" : ""}`}
            key={item.label}
            onClick={() => onSelect(item.key)}
            type="button"
            aria-pressed={selected === item.key}
          >
            <Icon size={18} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </button>
        );
      })}
    </section>
  );
}
