import React from "react";
import Globe from "react-globe.gl";

export type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

export type Plane = {
  lat: number;
  lng: number;
  icao24: string;
  heading?: number | null;
};

export default function GlobeView({ arcs, planes }: { arcs: Arc[]; planes?: Plane[] }) {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "black" }}>
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        arcsData={arcs}
        arcColor={() => "cyan"}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        pointsData={planes || []}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointColor={() => "orange"}
        pointRadius={() => 0.4}
        pointsMerge={true}
        />
    </div>
  );
}
