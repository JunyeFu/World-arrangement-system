import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, BarChart3, ClipboardList, LayoutDashboard } from "lucide-react";
import { useConsoleSnapshot } from "./state/useConsole";
import { Overview } from "./pages/Overview";
import { TaskDetail } from "./pages/TaskDetail";
import { Data } from "./pages/Data";
import { Audit } from "./pages/Audit";
import "./styles.css";

type Page = "overview" | "task" | "data" | "audit";

function App() {
  const { snapshot, error, refresh } = useConsoleSnapshot();
  const [page, setPage] = useState<Page>("overview");
  const [taskId, setTaskId] = useState<string | null>(null);

  const selectTask = (id: string) => {
    setTaskId(id);
    setPage("task");
  };

  return (
    <main>
      <aside>
        <div className="brand"><Activity size={22} /> World</div>
        <button aria-label="Overview" className={page === "overview" ? "active" : ""} onClick={() => setPage("overview")}><LayoutDashboard size={17} /> <span className="nav-label">Overview</span></button>
        <button aria-label="Data" className={page === "data" ? "active" : ""} onClick={() => setPage("data")}><BarChart3 size={17} /> <span className="nav-label">Data</span></button>
        <button aria-label="Audit" className={page === "audit" ? "active" : ""} onClick={() => setPage("audit")}><ClipboardList size={17} /> <span className="nav-label">Audit</span></button>
      </aside>
      <section className="workspace">
        {error && <div className="banner">{error}</div>}
        {!snapshot && <div className="panel">Loading console...</div>}
        {snapshot && page === "overview" && <Overview snapshot={snapshot} onSelectTask={selectTask} onRefresh={refresh} />}
        {snapshot && page === "data" && <Data snapshot={snapshot} />}
        {page === "audit" && <Audit />}
        {page === "task" && taskId && <TaskDetail taskId={taskId} />}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
