import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  getFlights,
  getCelebrities,
  getAnalytics,
  getBatchStates,
  getAirborneCelebrities,
} from "./api/flights";
import type { Flight, Celebrity, Analytics, PlaneStateDTO } from "./api/flights";
import { buildFlightPaths } from "./utils/flightPaths";
import {
  applyAllFilters,
  countActive,
  enrichFlights,
  DEFAULT_FILTERS,
} from "./utils/filterUtils";
import type { FlightFilters } from "./utils/filterUtils";
import GlobeView from "./components/GlobeView";
import type { GlobeHandle, Plane } from "./components/GlobeView";
import Sidebar from "./components/Sidebar";
import FlightInfoPanel from "./components/FlightInfoPanel";
import ModeToggle from "./components/ModeToggle";
import type { ViewMode } from "./components/ModeToggle";
import "./App.css";

type PlaneTarget = {
  icao24: string;
  lat: number;
  lng: number;
  heading: number | null;
};

const POLL_INTERVAL_MS = 10_000;
const CELEB_PROBE_INTERVAL_MS = 60_000;
const LERP_FACTOR = 0.08;

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [airborneCelebs, setAirborneCelebs] = useState<Flight[]>([]);
  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  const [states, setStates] = useState<Record<string, PlaneStateDTO>>({});
  const [targets, setTargets] = useState<Record<string, PlaneTarget>>({});
  const [display, setDisplay] = useState<Record<string, PlaneTarget>>({});
  const targetsRef = useRef(targets);

  const [mode, setMode] = useState<ViewMode>("all");
  const [filters, setFilters] = useState<FlightFilters>(DEFAULT_FILTERS);
  const [sidebarTab, setSidebarTab] = useState<"filters" | "celebrities" | "analytics">("filters");
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = Number(localStorage.getItem("sidebarWidth"));
    return Number.isFinite(saved) && saved >= 280 && saved <= 640 ? saved : 360;
  });
  const [sidebarFloating, setSidebarFloating] = useState<boolean>(() => {
    return localStorage.getItem("sidebarFloating") === "true";
  });
  const [sidebarFloatPos, setSidebarFloatPos] = useState<{ x: number; y: number }>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("sidebarFloatPos") || "null");
      if (v && Number.isFinite(v.x) && Number.isFinite(v.y)) return v;
    } catch { /* ignore */ }
    return { x: Math.max(20, window.innerWidth - 400), y: 80 };
  });
  const [sidebarFloatSize, setSidebarFloatSize] = useState<{ w: number; h: number }>(() => {
    try {
      const v = JSON.parse(localStorage.getItem("sidebarFloatSize") || "null");
      if (v && Number.isFinite(v.w) && Number.isFinite(v.h)) return v;
    } catch { /* ignore */ }
    return { w: 360, h: 560 };
  });
  const [clock, setClock] = useState(() => new Date());

  // Persist sidebar layout
  useEffect(() => {
    localStorage.setItem("sidebarWidth", String(sidebarWidth));
  }, [sidebarWidth]);
  useEffect(() => {
    localStorage.setItem("sidebarFloating", String(sidebarFloating));
  }, [sidebarFloating]);
  useEffect(() => {
    localStorage.setItem("sidebarFloatPos", JSON.stringify(sidebarFloatPos));
  }, [sidebarFloatPos]);
  useEffect(() => {
    localStorage.setItem("sidebarFloatSize", JSON.stringify(sidebarFloatSize));
  }, [sidebarFloatSize]);

  const globeRef = useRef<GlobeHandle | null>(null);

  useEffect(() => {
    (async () => {
      const [f, c, a] = await Promise.all([getFlights(), getCelebrities(), getAnalytics()]);
      setFlights(f);
      setCelebrities(c);
      setAnalytics(a);
    })();
  }, []);

  useEffect(() => {
    if (flights.length === 0) return;
    getAnalytics().then(setAnalytics);
  }, [flights.length]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      const probed = await getAirborneCelebrities();
      if (!cancelled) setAirborneCelebs(probed);
    };
    tick();
    const id = setInterval(tick, CELEB_PROBE_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleModeChange = useCallback((m: ViewMode) => {
    setMode(m);
    setSidebarTab(m === "celebrities" ? "celebrities" : "filters");
  }, []);

  const mergedFlights = useMemo(() => {
    const byIcao = new Map<string, Flight>();
    for (const f of flights) {
      if (f.icao24) byIcao.set(f.icao24.toLowerCase(), f);
    }
    for (const cf of airborneCelebs) {
      if (!cf.icao24) continue;
      const key = cf.icao24.toLowerCase();
      const existing = byIcao.get(key);
      if (existing) {
        byIcao.set(key, {
          ...existing,
          callsign: existing.callsign || cf.callsign,
          originCountry: existing.originCountry || cf.originCountry,
          aircraftModel: existing.aircraftModel || cf.aircraftModel,
          celebrityName: cf.celebrityName,
          celebrityCategory: cf.celebrityCategory,
        });
      } else {
        byIcao.set(key, cf);
      }
    }
    return Array.from(byIcao.values());
  }, [flights, airborneCelebs]);

  useEffect(() => {
    const icaos = Array.from(
      new Set(mergedFlights.map((f) => f.icao24).filter((c): c is string => !!c))
    );
    if (icaos.length === 0) return;

    let cancelled = false;
    const tick = async () => {
      const batch = await getBatchStates(icaos);
      if (cancelled) return;

      const nextStates: Record<string, PlaneStateDTO> = {};
      const nextTargets: Record<string, PlaneTarget> = {};
      for (const s of batch) {
        if (!s.icao24) continue;
        const key = s.icao24.toLowerCase();
        nextStates[key] = s;
        if (typeof s.lat === "number" && typeof s.lng === "number") {
          nextTargets[key] = {
            icao24: key,
            lat: s.lat,
            lng: s.lng,
            heading: typeof s.heading === "number" ? s.heading : null,
          };
        }
      }
      setStates(nextStates);
      setTargets(nextTargets);
    };

    tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [mergedFlights]);

  useEffect(() => { targetsRef.current = targets; }, [targets]);

  useEffect(() => {
    let raf = 0;
    const animate = () => {
      setDisplay((prev) => {
        const next: Record<string, PlaneTarget> = {};
        for (const k of Object.keys(targetsRef.current)) {
          const t = targetsRef.current[k];
          if (!t) continue;
          const cur = prev[k] ?? { ...t };
          next[k] = {
            icao24: k,
            lat: cur.lat + (t.lat - cur.lat) * LERP_FACTOR,
            lng: cur.lng + (t.lng - cur.lng) * LERP_FACTOR,
            heading: t.heading,
          };
        }
        return next;
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Enrich the merged flight set with derived fields. The liveIcaos set marks
  // any flight currently airborne (has a live state vector OR came from the
  // celebrity probe), so the Source filter can split historical vs live.
  const liveIcaos = useMemo(() => {
    const s = new Set<string>();
    for (const cf of airborneCelebs) {
      if (cf.icao24) s.add(cf.icao24.toLowerCase());
    }
    for (const k of Object.keys(states)) s.add(k);
    return s;
  }, [airborneCelebs, states]);

  const enriched = useMemo(
    () => enrichFlights(mergedFlights, states, liveIcaos),
    [mergedFlights, states, liveIcaos]
  );

  const flightsByIcao = useMemo(() => {
    const m = new Map<string, Flight>();
    for (const f of enriched) {
      if (f.icao24) m.set(f.icao24.toLowerCase(), f);
    }
    return m;
  }, [enriched]);

  const celebrityFlightsByIcao = useMemo(() => {
    const m = new Map<string, Flight>();
    for (const f of enriched) {
      if (f.icao24 && f.celebrityName) m.set(f.icao24.toLowerCase(), f);
    }
    return m;
  }, [enriched]);

  const visibleFlights = useMemo(() => {
    if (mode === "celebrities") return enriched.filter((f) => !!f.celebrityName);
    return applyAllFilters(enriched, filters);
  }, [enriched, mode, filters]);

  const paths = useMemo(() => buildFlightPaths(visibleFlights), [visibleFlights]);

  const planes: Plane[] = useMemo(() => {
    const visibleIcaos = new Set(
      visibleFlights.map((f) => f.icao24?.toLowerCase()).filter((s): s is string => !!s)
    );
    return Object.values(display)
      .filter((p) => visibleIcaos.has(p.icao24))
      .map((p) => {
        const flight = flightsByIcao.get(p.icao24);
        return {
          lat: p.lat,
          lng: p.lng,
          icao24: p.icao24,
          heading: p.heading,
          isCelebrity: !!flight?.celebrityName,
        };
      });
  }, [display, visibleFlights, flightsByIcao]);

  const handleCelebrityClick = useCallback(
    (celeb: Celebrity) => {
      for (const a of celeb.aircraft) {
        const key = a.icao24.toLowerCase();
        const live = display[key] ?? targets[key];
        if (live) {
          globeRef.current?.focusOn(live.lat, live.lng, 1.2);
          setSelectedIcao(key);
          return;
        }
      }
      setSelectedIcao(null);
    },
    [display, targets]
  );

  const handlePlaneClick = useCallback((icao24: string) => {
    setSelectedIcao(icao24.toLowerCase());
  }, []);

  const selectedFlight = selectedIcao ? flightsByIcao.get(selectedIcao) ?? null : null;
  const selectedState = selectedIcao ? states[selectedIcao] ?? null : null;

  const celebrityFlightCount = useMemo(
    () => enriched.filter((f) => f.celebrityName).length,
    [enriched]
  );

  const zuluTime = useMemo(() => {
    const h = clock.getUTCHours().toString().padStart(2, "0");
    const m = clock.getUTCMinutes().toString().padStart(2, "0");
    const s = clock.getUTCSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}Z`;
  }, [clock]);

  const activeFilterCount = useMemo(() => countActive(filters), [filters]);

  return (
    <div className="app-shell">
      <GlobeView ref={globeRef} paths={paths} planes={planes} onPlaneClick={handlePlaneClick} />

      <header className="hud-top">
        <div className="hud-brand">
          <span className="hud-title">Flight Tracker</span>
        </div>

        <ModeToggle mode={mode} onChange={handleModeChange} celebrityCount={celebrityFlightCount} />

        <div className="hud-status">
          <span className="hud-stat"><span className="dim">Tracked</span> <b>{enriched.length}</b></span>
          <span className="hud-stat"><span className="dim">Celebrities</span> <b className="gold">{celebrityFlightCount}</b></span>
          <span className="hud-clock">{zuluTime}</span>
        </div>
      </header>

      <Sidebar
        celebrities={celebrities}
        airborneCelebsByIcao={celebrityFlightsByIcao}
        analytics={analytics}
        flights={enriched}
        visibleCount={visibleFlights.length}
        filters={filters}
        onFiltersChange={setFilters}
        activeFilterCount={activeFilterCount}
        tab={sidebarTab}
        onTabChange={setSidebarTab}
        onCelebrityClick={handleCelebrityClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        width={sidebarWidth}
        onWidthChange={setSidebarWidth}
        floating={sidebarFloating}
        onFloatingChange={setSidebarFloating}
        floatPos={sidebarFloatPos}
        onFloatPosChange={setSidebarFloatPos}
        floatSize={sidebarFloatSize}
        onFloatSizeChange={setSidebarFloatSize}
        mode={mode}
      />

      {selectedFlight && (
        <FlightInfoPanel
          flight={selectedFlight}
          state={selectedState}
          onClose={() => setSelectedIcao(null)}
        />
      )}

      <div className="legend">
        <span className="legend-tick">LOW</span>
        <div className="legend-bar" />
        <span className="legend-tick">HIGH</span>
        <span style={{ marginLeft: 4 }}>ALTITUDE</span>
      </div>
    </div>
  );
}
