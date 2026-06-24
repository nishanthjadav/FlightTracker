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
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [clock, setClock] = useState(() => new Date());

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

  // Probe celebrity icao24s directly against OpenSky every minute. This surfaces
  // celebrity jets that aren't in the /api/flights window.
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

  // Top-bar clock (UTC zulu)
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Build the merged flight set: regular flights ∪ probed airborne celebs (deduped by icao24).
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
        // Merge: keep route info from the historical flight, copy celebrity fields.
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

  // Live state polling for all icao24s in the merged set.
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
        const targetKeys = Object.keys(targetsRef.current);
        for (const k of targetKeys) {
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

  const flightsByIcao = useMemo(() => {
    const m = new Map<string, Flight>();
    for (const f of mergedFlights) {
      if (f.icao24) m.set(f.icao24.toLowerCase(), f);
    }
    return m;
  }, [mergedFlights]);

  const celebrityFlightsByIcao = useMemo(() => {
    const m = new Map<string, Flight>();
    for (const f of mergedFlights) {
      if (f.icao24 && f.celebrityName) m.set(f.icao24.toLowerCase(), f);
    }
    return m;
  }, [mergedFlights]);

  const visibleFlights = useMemo(() => {
    if (mode === "celebrities") return mergedFlights.filter((f) => !!f.celebrityName);
    return mergedFlights;
  }, [mergedFlights, mode]);

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
    () => mergedFlights.filter((f) => f.celebrityName).length,
    [mergedFlights]
  );

  const zuluTime = useMemo(() => {
    const h = clock.getUTCHours().toString().padStart(2, "0");
    const m = clock.getUTCMinutes().toString().padStart(2, "0");
    const s = clock.getUTCSeconds().toString().padStart(2, "0");
    return `${h}:${m}:${s}Z`;
  }, [clock]);

  return (
    <div className="app-shell">
      <GlobeView ref={globeRef} paths={paths} planes={planes} onPlaneClick={handlePlaneClick} />

      <header className="hud-top">
        <div className="hud-brand">
          <span className="hud-title">Flight Tracker</span>
        </div>

        <ModeToggle mode={mode} onChange={setMode} celebrityCount={celebrityFlightCount} />

        <div className="hud-status">
          <span className="hud-stat"><span className="dim">Tracked</span> <b>{mergedFlights.length}</b></span>
          <span className="hud-stat"><span className="dim">Airborne</span> <b>{planes.length}</b></span>
          <span className="hud-stat"><span className="dim">Celebrities</span> <b className="gold">{airborneCelebs.length}</b></span>
          <span className="hud-clock">{zuluTime}</span>
        </div>
      </header>

      <Sidebar
        celebrities={celebrities}
        airborneCelebsByIcao={celebrityFlightsByIcao}
        analytics={analytics}
        onCelebrityClick={handleCelebrityClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
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
