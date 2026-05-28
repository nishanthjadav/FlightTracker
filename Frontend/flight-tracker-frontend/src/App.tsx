import { useEffect, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { airportMap } from "./data/airportMap.ts";

type Flight = {
  departureAirport: string | null;
  arrivalAirport: string | null;
};

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/flights")
      .then((res) => res.json())
      .then((data) => {
        console.log("RAW DATA:", data);
        setFlights(data);
      })
      .catch(console.error);
  }, []);

  const arcs = useMemo(() => {
    const result = flights
      .map((f) => {
        const from = f.departureAirport
          ? airportMap[f.departureAirport]
          : null;

        const to = f.arrivalAirport
          ? airportMap[f.arrivalAirport]
          : null;

        // DEBUG: missing airports show up clearly
        if (!from || !to) {
          console.log("MISSING AIRPORT:", f);
          return null;
        }

        if (f.departureAirport === f.arrivalAirport) return null;

        return {
          startLat: from.lat,
          startLng: from.lon,
          endLat: to.lat,
          endLng: to.lon,
        };
      })
      .filter(Boolean);

    console.log("ARCS COUNT:", result.length);
    return result;
  }, [flights]);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        arcsData={arcs}
        arcColor={() => "cyan"}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
      />
    </div>
  );
}