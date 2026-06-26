import { useMemo, useState, useRef, useEffect } from "react";
import type { Celebrity, Analytics, Flight } from "../api/flights";
import type { ViewMode } from "./ModeToggle";
import {
  buildOptions,
  type EnrichedFlight,
  type FlightFilters,
  type Option,
} from "../utils/filterUtils";
import { airportLabel } from "../utils/airportLabels";

type Tab = "filters" | "celebrities" | "analytics";

const MIN_WIDTH = 280;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 240;
const MAX_HEIGHT = 2000;

type Props = {
  celebrities: Celebrity[];
  airborneCelebsByIcao: Map<string, Flight>;
  analytics: Analytics | null;
  flights: EnrichedFlight[];
  visibleCount: number;
  filters: FlightFilters;
  onFiltersChange: (f: FlightFilters) => void;
  activeFilterCount: number;
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onCelebrityClick: (celeb: Celebrity) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
  onWidthChange: (w: number) => void;
  floating: boolean;
  onFloatingChange: (f: boolean) => void;
  floatPos: { x: number; y: number };
  onFloatPosChange: (p: { x: number; y: number }) => void;
  floatSize: { w: number; h: number };
  onFloatSizeChange: (s: { w: number; h: number }) => void;
  mode: ViewMode;
};

export default function Sidebar({
  celebrities,
  airborneCelebsByIcao,
  analytics,
  flights,
  visibleCount,
  filters,
  onFiltersChange,
  activeFilterCount,
  tab,
  onTabChange,
  onCelebrityClick,
  collapsed,
  onToggleCollapsed,
  width,
  onWidthChange,
  floating,
  onFloatingChange,
  floatPos,
  onFloatPosChange,
  floatSize,
  onFloatSizeChange,
  mode,
}: Props) {
  const [celebQuery, setCelebQuery] = useState("");

  const filteredCelebs = useMemo(() => {
    const q = celebQuery.trim().toLowerCase();
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
  }, [celebrities, celebQuery, airborneCelebsByIcao]);

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

  // Mode determines tab set. Celebrities mode: only Celebrities (no Analytics).
  const allowedTabs: readonly Tab[] =
    mode === "all" ? (["filters", "analytics"] as const) : (["celebrities"] as const);
  const activeTab: Tab = allowedTabs.includes(tab) ? tab : allowedTabs[0];

  const showTabBar = allowedTabs.length > 1;

  // ----- Docked resize (left edge) -----
  const startDockResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + (startX - ev.clientX)));
      onWidthChange(next);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
  };

  // ----- Floating drag (title bar) -----
  const startFloatDrag = (e: React.MouseEvent) => {
    // Ignore drag if user clicked a button inside the title bar.
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = floatPos;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const maxX = window.innerWidth - 80; // keep at least 80px visible
      const maxY = window.innerHeight - 40;
      const minX = 80 - floatSize.w;
      const minY = 0;
      onFloatPosChange({
        x: Math.min(maxX, Math.max(minX, start.x + dx)),
        y: Math.min(maxY, Math.max(minY, start.y + dy)),
      });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  // ----- Floating resize (any edge / corner) -----
  // dir is a combination of n/s/e/w (e.g. "se" = bottom-right corner).
  const startFloatResize = (dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const start = { ...floatSize, x: floatPos.x, y: floatPos.y };
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      let { w, h, x, y } = start;
      if (dir.includes("e")) {
        w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, start.w + dx));
      }
      if (dir.includes("s")) {
        h = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, start.h + dy));
      }
      if (dir.includes("w")) {
        const nextW = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, start.w - dx));
        x = start.x + (start.w - nextW);
        w = nextW;
      }
      if (dir.includes("n")) {
        const nextH = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, start.h - dy));
        y = start.y + (start.h - nextH);
        h = nextH;
      }
      onFloatSizeChange({ w, h });
      if (x !== start.x || y !== start.y) onFloatPosChange({ x, y });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.userSelect = "none";
    document.body.style.cursor = dir.length === 2 ? `${dir}-resize` : `${dir === "n" || dir === "s" ? "ns" : "ew"}-resize`;
  };

  const tabBar = showTabBar && (
    <div className="sidebar-tabs">
      <button
        className={activeTab === "filters" ? "active" : ""}
        onClick={() => onTabChange("filters")}
      >
        Filters
        {activeFilterCount > 0 && <span className="tab-badge">{activeFilterCount}</span>}
      </button>
      <button
        className={activeTab === "analytics" ? "active" : ""}
        onClick={() => onTabChange("analytics")}
      >
        Analytics
      </button>
    </div>
  );

  const body = (
    <div className="sidebar-body">
      {activeTab === "filters" ? (
        <FiltersView
          flights={flights}
          visibleCount={visibleCount}
          filters={filters}
          onFiltersChange={onFiltersChange}
          activeFilterCount={activeFilterCount}
        />
      ) : activeTab === "celebrities" ? (
        <CelebList
          celebrities={filteredCelebs}
          query={celebQuery}
          setQuery={setCelebQuery}
          airborneCelebsByIcao={airborneCelebsByIcao}
          onCelebrityClick={onCelebrityClick}
        />
      ) : (
        <AnalyticsView analytics={analytics} />
      )}
    </div>
  );

  // ----- Floating shell -----
  if (floating) {
    return (
      <aside
        className="sidebar sidebar-floating"
        style={{
          left: floatPos.x,
          top: floatPos.y,
          width: floatSize.w,
          height: floatSize.h,
        }}
      >
        <div className="float-titlebar" onMouseDown={startFloatDrag}>
          <span className="float-title">Panel</span>
          <div className="float-actions">
            <button
              className="float-action"
              onClick={() => onFloatingChange(false)}
              title="Dock to right"
              aria-label="Dock"
            >
              ⇲
            </button>
            <button
              className="float-action"
              onClick={onToggleCollapsed}
              title="Hide panel"
              aria-label="Hide"
            >
              ×
            </button>
          </div>
        </div>
        {tabBar}
        {body}
        {/* Resize handles: 4 edges + 4 corners */}
        <div className="resize-edge n" onMouseDown={startFloatResize("n")} />
        <div className="resize-edge s" onMouseDown={startFloatResize("s")} />
        <div className="resize-edge e" onMouseDown={startFloatResize("e")} />
        <div className="resize-edge w" onMouseDown={startFloatResize("w")} />
        <div className="resize-corner nw" onMouseDown={startFloatResize("nw")} />
        <div className="resize-corner ne" onMouseDown={startFloatResize("ne")} />
        <div className="resize-corner sw" onMouseDown={startFloatResize("sw")} />
        <div className="resize-corner se" onMouseDown={startFloatResize("se")} />
      </aside>
    );
  }

  // ----- Docked shell (right side) -----
  // Sidebar lives 12px from the right edge; the collapse handle sits flush
  // with its left edge, so it has to track sidebar width.
  const handleRight = width + 12;

  return (
    <>
      <button
        className="sidebar-handle"
        onClick={onToggleCollapsed}
        title="Hide panel"
        aria-label="Hide panel"
        style={{ right: handleRight }}
      >
        ›
      </button>
      <aside className="sidebar" style={{ width }}>
        <div
          className="sidebar-resize"
          onMouseDown={startDockResize}
          title="Drag to resize"
          aria-label="Resize panel"
        />
        <div className="sidebar-toolbar">
          <button
            className="float-action"
            onClick={() => onFloatingChange(true)}
            title="Pop out"
            aria-label="Pop out"
          >
            ⤢
          </button>
        </div>
        {tabBar}
        {body}
      </aside>
    </>
  );
}

// ---------------- Combobox ----------------

function Combobox({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.value.toLowerCase().includes(q) ||
        (o.label ?? "").toLowerCase().includes(q)
    );
  }, [options, query]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setOpen(false);
    setQuery("");
  };

  const disabled = options.length === 0;
  const displayLabel = useMemo(() => {
    if (!value) return "";
    const opt = options.find((o) => o.value === value);
    return opt?.label ?? value;
  }, [value, options]);

  return (
    <div className={`combobox${open ? " open" : ""}${disabled ? " disabled" : ""}`} ref={ref}>
      <div
        className="combobox-trigger"
        onClick={() => {
          if (disabled) return;
          setOpen((o) => !o);
          setQuery("");
        }}
      >
        <span className={value ? "combobox-value" : "combobox-placeholder"}>
          {value ? displayLabel : disabled ? emptyLabel ?? "No data" : placeholder}
        </span>
        <span className="combobox-controls">
          {value && (
            <button className="combobox-clear" onClick={clear} aria-label="Clear">
              ×
            </button>
          )}
          {!disabled && <span className={`combobox-chevron${open ? " up" : ""}`}>▾</span>}
        </span>
      </div>
      {open && !disabled && (
        <div className="combobox-dropdown">
          <input
            className="combobox-search"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="combobox-list">
            {filtered.length === 0 ? (
              <div className="combobox-empty">No matches</div>
            ) : (
              filtered.map((o) => (
                <div
                  key={o.value}
                  className={`combobox-option${o.value === value ? " selected" : ""}${
                    o.count === 0 ? " zero" : ""
                  }`}
                  onMouseDown={() => select(o.value)}
                >
                  <span className="combobox-option-label">{o.label ?? o.value}</span>
                  <span className="combobox-option-count">{o.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- Filters panel ----------------

function FiltersView({
  flights,
  visibleCount,
  filters,
  onFiltersChange,
  activeFilterCount,
}: {
  flights: EnrichedFlight[];
  visibleCount: number;
  filters: FlightFilters;
  onFiltersChange: (f: FlightFilters) => void;
  activeFilterCount: number;
}) {
  const update = (patch: Partial<FlightFilters>) => onFiltersChange({ ...filters, ...patch });
  const clear = () =>
    onFiltersChange({
      source: "",
      departureAirport: "",
      arrivalAirport: "",
      departureCountry: "",
      arrivalCountry: "",
      operatorCountry: "",
      aircraftModel: "",
      celebrityCategory: "",
      region: "",
      altBand: "",
      speedBand: "",
      status: "",
      celebOnly: false,
      hasCoordsOnly: false,
    });

  // Source-aware option builders. Airports/dep-arr country need historical
  // route data; status/altitude/speed need live state. Each builder cascades
  // through all OTHER active filters.
  const depOpts = useMemo(
    () =>
      buildOptions(flights, filters, "departureAirport", (f) => f.departureAirport, {
        sort: "alpha",
        labelFor: airportLabel,
      }),
    [flights, filters]
  );
  const arrOpts = useMemo(
    () =>
      buildOptions(flights, filters, "arrivalAirport", (f) => f.arrivalAirport, {
        sort: "alpha",
        labelFor: airportLabel,
      }),
    [flights, filters]
  );
  const depCountryOpts = useMemo(
    () => buildOptions(flights, filters, "departureCountry", (f) => f.depCountry),
    [flights, filters]
  );
  const arrCountryOpts = useMemo(
    () => buildOptions(flights, filters, "arrivalCountry", (f) => f.arrCountry),
    [flights, filters]
  );
  const opCountryOpts = useMemo(
    () => buildOptions(flights, filters, "operatorCountry", (f) => f.originCountry),
    [flights, filters]
  );
  const modelOpts = useMemo(
    () => buildOptions(flights, filters, "aircraftModel", (f) => f.aircraftModel),
    [flights, filters]
  );
  const categoryOpts = useMemo(
    () => buildOptions(flights, filters, "celebrityCategory", (f) => f.celebrityCategory),
    [flights, filters]
  );
  const regionOpts = useMemo(
    () => buildOptions(flights, filters, "region", (f) => f.region),
    [flights, filters]
  );
  const altOpts = useMemo(
    () => buildOptions(flights, filters, "altBand", (f) => f.altBand),
    [flights, filters]
  );
  const speedOpts = useMemo(
    () => buildOptions(flights, filters, "speedBand", (f) => f.speedBand),
    [flights, filters]
  );
  const statusOpts = useMemo(
    () => buildOptions(flights, filters, "status", (f) => f.status),
    [flights, filters]
  );
  const sourceOpts = useMemo(
    () => buildOptions(flights, filters, "source", (f) => (f.isLive ? "live" : f.isHistorical ? "historical" : null)),
    [flights, filters]
  );

  const liveCount = sourceOpts.find((o) => o.value === "live")?.count ?? 0;
  const histCount = sourceOpts.find((o) => o.value === "historical")?.count ?? 0;

  // Hide whole sections when there's no meaningful split (<2 distinct options).
  const hasSignal = (opts: Option[]) => opts.filter((o) => o.count > 0).length >= 2;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <div className="filter-panel-title-row">
          <span className="filter-panel-title">Filter Flights</span>
          <span className="filter-result-count">
            {visibleCount} <span className="dim">of {flights.length}</span>
          </span>
        </div>
        {activeFilterCount > 0 && (
          <button className="filter-clear-btn" onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      {/* Source — the most important filter; lives at top */}
      <div className="filter-section">
        <label className="filter-label">Source</label>
        <div className="filter-pills">
          <PillButton
            label="All"
            count={flights.length}
            active={!filters.source}
            onClick={() => update({ source: "" })}
          />
          <PillButton
            label="Live now"
            count={liveCount}
            dotClass="live"
            active={filters.source === "live"}
            onClick={() => update({ source: "live" })}
          />
          <PillButton
            label="Historical"
            count={histCount}
            active={filters.source === "historical"}
            onClick={() => update({ source: "historical" })}
          />
        </div>
        <div className="filter-hint">
          Live = currently airborne (state-vector). Historical = past flights with departure / arrival data.
        </div>
      </div>

      {/* Route filters — only meaningful when historical data exists */}
      {(hasSignal(depOpts) || hasSignal(arrOpts)) && (
        <div className="filter-grid">
          {hasSignal(depOpts) && (
            <div className="filter-grid-item">
              <label className="filter-label">Departure</label>
              <Combobox
                value={filters.departureAirport}
                onChange={(v) => update({ departureAirport: v })}
                options={depOpts}
                placeholder={`Any (${depOpts.length})`}
                emptyLabel="No route data"
              />
            </div>
          )}
          {hasSignal(arrOpts) && (
            <div className="filter-grid-item">
              <label className="filter-label">Arrival</label>
              <Combobox
                value={filters.arrivalAirport}
                onChange={(v) => update({ arrivalAirport: v })}
                options={arrOpts}
                placeholder={`Any (${arrOpts.length})`}
                emptyLabel="No route data"
              />
            </div>
          )}
          {hasSignal(depCountryOpts) && (
            <div className="filter-grid-item">
              <label className="filter-label">From Country</label>
              <Combobox
                value={filters.departureCountry}
                onChange={(v) => update({ departureCountry: v })}
                options={depCountryOpts}
                placeholder={`Any (${depCountryOpts.length})`}
              />
            </div>
          )}
          {hasSignal(arrCountryOpts) && (
            <div className="filter-grid-item">
              <label className="filter-label">To Country</label>
              <Combobox
                value={filters.arrivalCountry}
                onChange={(v) => update({ arrivalCountry: v })}
                options={arrCountryOpts}
                placeholder={`Any (${arrCountryOpts.length})`}
              />
            </div>
          )}
        </div>
      )}

      {/* Operator / aircraft — meaningful in both live and historical */}
      {hasSignal(opCountryOpts) && (
        <div className="filter-section">
          <label className="filter-label">Operator Country</label>
          <Combobox
            value={filters.operatorCountry}
            onChange={(v) => update({ operatorCountry: v })}
            options={opCountryOpts}
            placeholder={`Any (${opCountryOpts.length})`}
          />
        </div>
      )}

      {hasSignal(modelOpts) && (
        <div className="filter-section">
          <label className="filter-label">Aircraft Model</label>
          <Combobox
            value={filters.aircraftModel}
            onChange={(v) => update({ aircraftModel: v })}
            options={modelOpts}
            placeholder={`Any (${modelOpts.length})`}
          />
        </div>
      )}

      {hasSignal(categoryOpts) && (
        <div className="filter-section">
          <label className="filter-label">Celebrity Category</label>
          <Combobox
            value={filters.celebrityCategory}
            onChange={(v) => update({ celebrityCategory: v })}
            options={categoryOpts}
            placeholder={`Any (${categoryOpts.length})`}
          />
        </div>
      )}

      {/* Live-only filters: region, altitude, speed, status */}
      {hasSignal(regionOpts) && (
        <div className="filter-section">
          <label className="filter-label">Region</label>
          <Combobox
            value={filters.region}
            onChange={(v) => update({ region: v })}
            options={regionOpts}
            placeholder={`Any (${regionOpts.length})`}
          />
        </div>
      )}

      {hasSignal(altOpts) && (
        <div className="filter-section">
          <label className="filter-label">Altitude</label>
          <div className="filter-pills">
            <PillButton
              label="Any"
              count={flights.length}
              active={!filters.altBand}
              onClick={() => update({ altBand: "" })}
            />
            <PillButton
              label="Low"
              count={altOpts.find((o) => o.value === "low")?.count ?? 0}
              active={filters.altBand === "low"}
              onClick={() => update({ altBand: "low" })}
              hint="< 2000 m"
            />
            <PillButton
              label="Cruise"
              count={altOpts.find((o) => o.value === "cruise")?.count ?? 0}
              active={filters.altBand === "cruise"}
              onClick={() => update({ altBand: "cruise" })}
              hint="2 – 9 km"
            />
            <PillButton
              label="High"
              count={altOpts.find((o) => o.value === "high")?.count ?? 0}
              active={filters.altBand === "high"}
              onClick={() => update({ altBand: "high" })}
              hint="> 9 km"
            />
          </div>
        </div>
      )}

      {hasSignal(speedOpts) && (
        <div className="filter-section">
          <label className="filter-label">Speed</label>
          <div className="filter-pills">
            <PillButton
              label="Any"
              count={flights.length}
              active={!filters.speedBand}
              onClick={() => update({ speedBand: "" })}
            />
            <PillButton
              label="Slow"
              count={speedOpts.find((o) => o.value === "slow")?.count ?? 0}
              active={filters.speedBand === "slow"}
              onClick={() => update({ speedBand: "slow" })}
              hint="< 200 kt"
            />
            <PillButton
              label="Cruise"
              count={speedOpts.find((o) => o.value === "cruise")?.count ?? 0}
              active={filters.speedBand === "cruise"}
              onClick={() => update({ speedBand: "cruise" })}
              hint="200 – 430 kt"
            />
            <PillButton
              label="Fast"
              count={speedOpts.find((o) => o.value === "fast")?.count ?? 0}
              active={filters.speedBand === "fast"}
              onClick={() => update({ speedBand: "fast" })}
              hint="> 430 kt"
            />
          </div>
        </div>
      )}

      {hasSignal(statusOpts) && (
        <div className="filter-section">
          <label className="filter-label">Status</label>
          <div className="filter-pills">
            <PillButton
              label="Any"
              count={flights.length}
              active={!filters.status}
              onClick={() => update({ status: "" })}
            />
            <PillButton
              label="Airborne"
              count={statusOpts.find((o) => o.value === "airborne")?.count ?? 0}
              active={filters.status === "airborne"}
              onClick={() => update({ status: "airborne" })}
            />
            <PillButton
              label="On ground"
              count={statusOpts.find((o) => o.value === "ground")?.count ?? 0}
              active={filters.status === "ground"}
              onClick={() => update({ status: "ground" })}
            />
          </div>
        </div>
      )}

      <div className="filter-section">
        <label className="filter-checkbox-row">
          <input
            type="checkbox"
            checked={filters.celebOnly}
            onChange={(e) => update({ celebOnly: e.target.checked })}
          />
          <span>★ Celebrity flights only</span>
        </label>
        <label className="filter-checkbox-row">
          <input
            type="checkbox"
            checked={filters.hasCoordsOnly}
            onChange={(e) => update({ hasCoordsOnly: e.target.checked })}
          />
          <span>Mapped routes only</span>
        </label>
      </div>

      {activeFilterCount === 0 && (
        <div className="celeb-empty" style={{ marginTop: 12 }}>
          No filters active — showing all flights
        </div>
      )}
    </div>
  );
}

function PillButton({
  label,
  count,
  active,
  onClick,
  hint,
  dotClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  hint?: string;
  dotClass?: string;
}) {
  const disabled = count === 0 && !active;
  return (
    <button
      className={`filter-pill${active ? " active" : ""}${disabled ? " disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={hint}
    >
      {dotClass && <span className={`pill-dot ${dotClass}`} />}
      <span>{label}</span>
      <span className="filter-pill-count">{count}</span>
    </button>
  );
}

// ---------------- Celebrity list ----------------

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
        placeholder="Search name, category, registration…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {celebrities.length === 0 && <div className="celeb-empty">No matches</div>}
      {celebrities.map((c) => {
        const airborne = c.aircraft.some((a) => airborneCelebsByIcao.has(a.icao24));
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
            <div className="celeb-meta">{c.aircraft.map((a) => a.registration).join(" · ")}</div>
            <div className="celeb-category">{c.category}</div>
          </button>
        );
      })}
    </>
  );
}

// ---------------- Analytics ----------------

function AnalyticsView({ analytics }: { analytics: Analytics | null }) {
  if (!analytics) return <div className="celeb-empty">Loading analytics…</div>;
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <StatTile label="Flights" value={analytics.totalFlights} />
        <StatTile label="Celebrities" value={analytics.celebrityFlights} accent="gold" />
      </div>
      <BarSection title="Top Routes" buckets={analytics.topRoutes} labelFor={formatRouteLabel} />
      <BarSection title="Departure Countries" buckets={analytics.topDepartureCountries} />
      <BarSection title="Arrival Countries" buckets={analytics.topArrivalCountries} />
      <BarSection title="Aircraft Operators" buckets={analytics.topOriginCountries} />
      <BarSection
        title="Busiest Departure Airports"
        buckets={analytics.topDepartureAirports}
        labelFor={airportLabel}
      />
    </>
  );
}

/** "KLAX → KJFK" → "Los Angeles, CA (KLAX) → New York, NY (KJFK)". */
function formatRouteLabel(raw: string): string {
  const parts = raw.split(/→|->/).map((s) => s.trim());
  if (parts.length !== 2) return raw;
  return `${airportLabel(parts[0])} → ${airportLabel(parts[1])}`;
}

function StatTile({ label, value, accent }: { label: string; value: number; accent?: "gold" }) {
  return (
    <div className="analytics-stat">
      <div className="analytics-stat-label">{label}</div>
      <div
        className="analytics-stat-value"
        style={accent === "gold" ? { color: "var(--gold)" } : undefined}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function BarSection({
  title,
  buckets,
  labelFor,
}: {
  title: string;
  buckets: { label: string; count: number }[];
  labelFor?: (raw: string) => string;
}) {
  if (!buckets || buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.count));
  return (
    <div className="analytics-section">
      <h3>{title}</h3>
      {buckets.slice(0, 8).map((b) => {
        const display = labelFor ? labelFor(b.label) : b.label;
        return (
          <div className="bar-row" key={b.label}>
            <div className="label" title={display}>{display}</div>
            <div className="track">
              <div className="fill" style={{ width: `${(b.count / max) * 100}%` }} />
            </div>
            <div className="count">{b.count}</div>
          </div>
        );
      })}
    </div>
  );
}
