import { useEffect, useState } from "react";
import Globe from "react-globe.gl";
import { flights as initialFlights } from "./data/flights";
import { interpolateLatLng } from "./utils/interpolate";

export default function App() {
  const [flights, setFlights] = useState(initialFlights);

  useEffect(() => {
    const interval = setInterval(() => {
      setFlights((prev) =>
        prev.map((f) => {
          const newProgress = f.progress + 0.01;

          return {
            ...f,
            progress: newProgress > 1 ? 0 : newProgress,
          };
        })
      );
    }, 30);

    return () => clearInterval(interval);
  }, []);

  const points = flights.map((f) => {
    const pos = interpolateLatLng(f.from, f.to, f.progress);

    return {
      lat: pos.lat,
      lng: pos.lng,
      color: f.color,
      size: f.size,
    };
  });

  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundColor="black"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={0.1}
        pointRadius="size"
      />
    </div>
  );
}