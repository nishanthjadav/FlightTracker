import { useEffect, useState, useMemo, useRef } from "react";
import { getFlights } from "./api/flights";
import type { Flight } from "./api/flights";
import { buildArcs } from "./utils/flightTransforms";
import GlobeView from "./components/GlobeView";

type PlaneTarget = { lat: number; lng: number; heading?: number | null; icao24: string };

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [targets, setTargets] = useState<Record<string, PlaneTarget>>({});
  const [display, setDisplay] = useState<Record<string, PlaneTarget>>({});
  const targetsRef = useRef(targets);

  useEffect(() => {
    (async () => {
      try {
        const data = await getFlights();
        setFlights(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("getFlights error", e);
        setFlights([]);
      }
    })();
  }, []);

  // Poll OpenSky state via backend proxy every 4s
  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    if (!flights || flights.length === 0) return;

    let cancelled = false;

    const tick = async () => {
      for (const f of flights) {
        if (!f.icao24) continue;
        const icao = f.icao24;
        console.log("Fetching state for ICAO:", icao);
        try {
          const res = await fetch(`/api/state/${icao}`);
          const data = await res.json();
          console.log("Received state for", icao, data);
          if (data && typeof data.lat === "number" && typeof data.lng === "number") {
            setTargets((prev) => ({
              ...prev,
              [icao]: { lat: data.lat, lng: data.lng, heading: data.heading ?? null, icao24: icao },
            }));
            console.log("Updated plane position for", icao, data.lat, data.lng);
          }
        } catch (e) {
          console.error("state fetch error for", icao, e);
        }
      }
    };

    // initial run
    tick();
    const id = setInterval(() => { if (!cancelled) tick(); }, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, [flights]);

  // Smoothly interpolate display positions toward targets
  useEffect(() => {
    let raf = 0;
    const animate = () => {
      setDisplay((prev) => {
        const next: Record<string, PlaneTarget> = { ...prev };
        const keys = Object.keys(targetsRef.current || {});
        for (const k of keys) {
          const t = targetsRef.current[k];
          if (!t) continue;
          const cur = next[k] ?? { lat: t.lat, lng: t.lng, heading: t.heading ?? null, icao24: k };
          // lerp factor
          const f = 0.12;
          const lat = cur.lat + (t.lat - cur.lat) * f;
          const lng = cur.lng + (t.lng - cur.lng) * f;
          next[k] = { lat, lng, heading: t.heading ?? null, icao24: k };
        }
        return next;
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const arcs = useMemo(() => buildArcs(flights), [flights]);

  const planesArray = useMemo(() => {
    return Object.values(display).map((p) => ({ lat: p.lat, lng: p.lng, icao24: p.icao24, heading: p.heading }));
  }, [display]);

  useEffect(() => {
    console.log("planePositions map updated", Object.keys(display).length);
  }, [display]);

  return <GlobeView arcs={arcs} planes={planesArray} />;
}