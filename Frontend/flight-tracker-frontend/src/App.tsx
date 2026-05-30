import { useEffect, useState, useMemo } from "react";
import { getFlights } from "./api/flights";
import type { Flight } from "./api/flights";import { buildArcs } from "./utils/flightTransforms";
import GlobeView from "./components/GlobeView";

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
  (async () => {
    try {
      const data = await getFlights();
      setFlights(Array.isArray(data) ? data : []);
    } catch {
      setFlights([]);
    }
  })();
}, []);

  const arcs = useMemo(() => buildArcs(flights), [flights]);

  return <GlobeView arcs={arcs} />;
}