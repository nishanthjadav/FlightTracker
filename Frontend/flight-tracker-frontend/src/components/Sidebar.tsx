import { useMemo, useState } from "react";
import type { Celebrity, Analytics, Flight } from "../api/flights";

type Props = {
  celebrities: Celebrity[];
  airborneCelebsByIcao: Map<string, Flight>;
  analytics: Analytics | null;
  onCelebrityClick: (celeb: Celebrity) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
};

type Tab = "celebrities" | "analytics";

export default function Sidebar({
  celebrities,
  airborneCelebsByIcao,
  analytics,
  onCelebrityClick,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const [tab, setTab] = useState<Tab>("celebrities");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? celebrities.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.category.toLowerCase().includes(q) ||
            c.aircraft.some((a) => a.registration.toLowerCase().includes(q))
        )
      : celebrities;

    return [...list].sort((a, b) => {
      const aAir = a.aircraft.some((ac) => airborneCelebsByIcao.has(ac.icao24));
      const bAir = b.aircraft.some((ac) => airborneCelebsByIcao.has(ac.icao24));
      if (aAir !== bAir) return aAir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [celebrities, query, airborneCelebsByIcao]);

  if (collapsed) {
    return (
      <button
        className="sidebar-handle collapsed"
        onClick={onToggleCollapsed}
        title="Show panel"
        aria-label="Show panel"
      >
        ‹
      </button>
    );
  }

  return (
    <>
      <button
        className="sidebar-handle"
        onClick={onToggleCollapsed}
        title="Hide panel"
        aria-label="Hide panel"
      >
        ›
      </button>
      <aside className="sidebar">
        <div className="sidebar-tabs">
          <button
            className={tab === "celebrities" ? "active" : ""}
            onClick={() => setTab("celebrities")}
          >
            Celebrities
          </button>
          <button
            className={tab === "analytics" ? "active" : ""}
            onClick={() => setTab("analytics")}
          >
            Analytics
          </button>
        </div>

      <div className="sidebar-body">
        {tab === "celebrities" ? (
          <CelebList
            celebrities={filtered}
            query={query}
            setQuery={setQuery}
            airborneCelebsByIcao={airborneCelebsByIcao}
            onCelebrityClick={onCelebrityClick}
          />
        ) : (
          <AnalyticsView analytics={analytics} />
        )}
      </div>
      </aside>
    </>
  );
}

function CelebList({
  celebrities,
  query,
  setQuery,
  airborneCelebsByIcao,
  onCelebrityClick,
}: {
  celebrities: Celebrity[];
  query: string;
  setQuery: (q: string) => void;
  airborneCelebsByIcao: Map<string, Flight>;
  onCelebrityClick: (celeb: Celebrity) => void;
}) {
  return (
    <>
      <input
        className="search-input"
        placeholder="Search celebrities, registrations…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {celebrities.length === 0 && <div className="celeb-empty">No matches</div>}
      {celebrities.map((c) => {
        const airborneAircraft = c.aircraft.find((a) => airborneCelebsByIcao.has(a.icao24));
        const airborne = !!airborneAircraft;
        return (
          <button
            key={c.name}
            className={`celeb-card${airborne ? " airborne" : ""}`}
            onClick={() => onCelebrityClick(c)}
          >
            <div className="celeb-name">
              <span>{c.name}</span>
              {airborne && <span className="airborne-dot" title="Currently airborne" />}
            </div>
            <div className="celeb-meta">
              {c.aircraft.map((a) => a.registration).join(" · ")}
            </div>
            <div className="celeb-category">{c.category}</div>
          </button>
        );
      })}
    </>
  );
}

function AnalyticsView({ analytics }: { analytics: Analytics | null }) {
  if (!analytics) {
    return <div className="celeb-empty">Loading analytics…</div>;
  }
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatTile label="Flights" value={analytics.totalFlights} />
        <StatTile label="Celebrities" value={analytics.celebrityFlights} accent="gold" />
      </div>

      <BarSection title="Top Routes" buckets={analytics.topRoutes} />
      <BarSection title="Departure Countries" buckets={analytics.topDepartureCountries} />
      <BarSection title="Arrival Countries" buckets={analytics.topArrivalCountries} />
      <BarSection title="Aircraft Operators (origin)" buckets={analytics.topOriginCountries} />
      <BarSection title="Busiest Departure Airports" buckets={analytics.topDepartureAirports} />
    </>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: "gold" }) {
  return (
    <div className="analytics-stat" style={{ display: "block" }}>
      <div className="analytics-stat-label">{label}</div>
      <div className="analytics-stat-value" style={accent === "gold" ? { color: "var(--gold)" } : undefined}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function BarSection({ title, buckets }: { title: string; buckets: { label: string; count: number }[] }) {
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.count));
  return (
    <div className="analytics-section">
      <h3>{title}</h3>
      {buckets.slice(0, 8).map((b) => (
        <div className="bar-row" key={b.label}>
          <div className="label" title={b.label}>{b.label}</div>
          <div className="track">
            <div className="fill" style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
          <div className="count">{b.count}</div>
        </div>
      ))}
    </div>
  );
}
