import { useEffect, useState } from "react";
import Globe from "react-globe.gl";

type Flight = {
  id: string;
  airline: string;
  lat: number;
  lng: number;
  heading: number;
  velocity: number;
};

function projectPoint(
  lat: number,
  lng: number,
  heading: number,
  distance: number
) {
  const rad = (heading * Math.PI) / 180;

  return {
    lat: lat + Math.cos(rad) * distance,
    lng: lng + Math.sin(rad) * distance,
  };
}

export default function App() {
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/flights")
      .then((res) => res.json())
      .then((data) => setFlights(data))
      .catch((err) => console.error(err));
  }, []);

  const arcs = flights
    .filter((flight) => flight.velocity != null && flight.velocity > 50)
    .map((flight) => {
      const projected = projectPoint(
        flight.lat,
        flight.lng,
        flight.heading ?? 0,
        1
      );

      return {
        startLat: flight.lat,
        startLng: flight.lng,
        endLat: projected.lat,
        endLng: projected.lng,
      };
    });

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        overflow: "hidden",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Globe
        style={{ width: "100%", height: "100%" }}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="black"
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => "cyan"}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
      />
    </div>
  );
}