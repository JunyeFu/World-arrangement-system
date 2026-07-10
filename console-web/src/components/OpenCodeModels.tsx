import { ChevronDown, ChevronRight, Cpu } from "lucide-react";
import { useState } from "react";
import { OpenCodeCatalog } from "../api/client";

export function OpenCodeModels({ catalog }: { catalog: OpenCodeCatalog }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <section className="panel opencode-models">
      <button
        className="panel-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="panel-toggle-title">
          {expanded ? <ChevronDown size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
          <span>OpenCode Runtime</span>
        </span>
        <small>Refreshes at most every {catalog.cache_seconds}s</small>
      </button>
      {expanded && <div className="opencode-endpoints">
        {catalog.endpoints.map((endpoint) => (
          <div className="opencode-endpoint" key={endpoint.side}>
            <div className="opencode-endpoint-head">
              <Cpu size={16} />
              <strong>{endpoint.label}</strong>
              <span className={`status ${endpoint.available ? "active" : "failed"}`}>
                {endpoint.available ? "Available" : "Unavailable"}
              </span>
            </div>
            {endpoint.available ? (
              <>
                <ul>
                  {endpoint.models.slice(0, 8).map((model) => (
                  <li key={model.id}>
                    <strong>{model.name}</strong>
                    <small>{model.id}{model.variants.length ? ` · ${model.variants.join(", ")}` : ""}</small>
                  </li>
                  ))}
                </ul>
                {endpoint.models.length > 8 && <small>{endpoint.models.length} models discovered</small>}
              </>
            ) : <small>{endpoint.detail || "OpenCode model catalog is unavailable"}</small>}
          </div>
        ))}
      </div>}
    </section>
  );
}
