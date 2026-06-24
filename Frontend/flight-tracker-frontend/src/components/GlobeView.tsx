import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
import Globe from "react-globe.gl";
import * as THREE from "three";
import type { FlightPath, PathPoint } from "../utils/flightPaths";
import { altitudeColor, buildPathPlanes } from "../utils/flightPaths";

export type Plane = {
  lat: number;
  lng: number;
  icao24: string;
  heading?: number | null;
  altitude?: number | null;
  isCelebrity?: boolean;
};

type RenderedPlane = Plane & {
  /** "live" = state-vector position, "leading" = arrival endpoint of path */
  kind: "live" | "leading";
};

export type GlobeHandle = {
  focusOn: (lat: number, lng: number, altitude?: number) => void;
};

type Props = {
  paths: FlightPath[];
  planes?: Plane[];
  onPlaneClick?: (icao24: string) => void;
};

const PLANE_GEOMETRY = (() => {
  const group = new THREE.Group();

  const fuselage = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 1.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  fuselage.rotation.x = Math.PI / 2;
  group.add(fuselage);

  const wings = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.08, 0.35),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  wings.position.z = 0.1;
  group.add(wings);

  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.05, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  tail.position.z = -0.55;
  group.add(tail);

  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.32, 0.25),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  fin.position.z = -0.55;
  fin.position.y = 0.16;
  group.add(fin);

  return group;
})();

const PLANE_GEOMETRY_GOLD = (() => {
  const group = PLANE_GEOMETRY.clone(true);
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.material = new THREE.MeshBasicMaterial({ color: 0xffd84d });
    }
  });
  group.scale.set(1.5, 1.5, 1.5);
  return group;
})();

// Distance from globe center, in globe radii. react-globe.gl uses globe radius = 100 internally,
// so camera distance is measured in those units. ~250 = fully zoomed out (default), ~140 = close.
const AUTO_ROTATE_DISTANCE_THRESHOLD = 240;

const GlobeView = forwardRef<GlobeHandle, Props>(function GlobeView(
  { paths, planes, onPlaneClick }: Props,
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!hostRef.current) return;
    const update = () => {
      if (!hostRef.current) return;
      const rect = hostRef.current.getBoundingClientRect();
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(hostRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    focusOn: (lat: number, lng: number, altitude: number = 1.2) => {
      if (globeRef.current && typeof globeRef.current.pointOfView === "function") {
        globeRef.current.pointOfView({ lat, lng, altitude }, 1200);
      }
    },
  }), []);

  // Auto-rotate gating: only spin when the camera is fully zoomed out.
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls?.();
    if (!controls) return;

    controls.enableDamping = true;
    controls.autoRotateSpeed = 0.25;
    controls.autoRotate = true;

    const camera = globeRef.current.camera?.();

    const evaluate = () => {
      if (!camera) return;
      const dist = camera.position.length();
      const shouldRotate = dist >= AUTO_ROTATE_DISTANCE_THRESHOLD;
      if (controls.autoRotate !== shouldRotate) {
        controls.autoRotate = shouldRotate;
      }
    };

    controls.addEventListener("change", evaluate);
    evaluate();

    return () => {
      controls.removeEventListener("change", evaluate);
    };
  }, [size.width]);

  const pathPointAlt = useCallback((pt: PathPoint) => {
    return 0.005 + pt[2] * 0.28;
  }, []);

  // three-globe's pathColor is called once per *path* and may return a single color
  // (solid) or an array of colors matching the points (gradient). We pre-compute the
  // per-point color array for each path so the gradient renders correctly.
  const pathsWithColors = useMemo(() => {
    return paths.map((p) => ({
      points: p.points,
      colors: p.points.map((pt) => altitudeColor(pt[2], 0.95)),
    }));
  }, [paths]);

  const pathColorFn = useCallback((d: object) => {
    return (d as { colors: string[] }).colors;
  }, []);

  // Merge the live state-vector planes with one plane-icon per path (at arrival end).
  // If a flight has both, the live position wins (more accurate "where is it now").
  const renderedPlanes = useMemo<RenderedPlane[]>(() => {
    const live: RenderedPlane[] = (planes || []).map((p) => ({ ...p, kind: "live" }));
    const liveIcaos = new Set(live.map((p) => p.icao24));
    const leading: RenderedPlane[] = buildPathPlanes(paths)
      .filter((p) => !p.icao24 || !liveIcaos.has(p.icao24))
      .map((p) => ({
        lat: p.lat,
        lng: p.lng,
        icao24: p.icao24 ?? "",
        heading: p.heading,
        isCelebrity: p.isCelebrity,
        kind: "leading",
      }));
    return [...live, ...leading];
  }, [planes, paths]);

  return (
    <div ref={hostRef} className="globe-host">
      {size.width > 0 && size.height > 0 && (
        <Globe
          ref={globeRef}
          width={size.width}
          height={size.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere={true}
          atmosphereColor="#5a7a99"
          atmosphereAltitude={0.08}

          pathsData={pathsWithColors}
          pathPoints={(d: object) => (d as { points: PathPoint[] }).points}
          pathPointLat={(p: object) => (p as PathPoint)[0]}
          pathPointLng={(p: object) => (p as PathPoint)[1]}
          pathPointAlt={pathPointAlt as unknown as (p: object) => number}
          pathColor={pathColorFn as unknown as (d: object) => string | string[]}
          pathStroke={1.6}
          pathDashLength={0.5}
          pathDashGap={0.18}
          pathDashAnimateTime={6000}
          pathTransitionDuration={0}

          objectsData={renderedPlanes}
          objectLat={(d: object) => (d as RenderedPlane).lat}
          objectLng={(d: object) => (d as RenderedPlane).lng}
          objectAltitude={() => 0.015}
          objectFacesSurface={false}
          objectThreeObject={(d: object) => {
            const p = d as RenderedPlane;
            const base = p.isCelebrity ? PLANE_GEOMETRY_GOLD : PLANE_GEOMETRY;
            const clone = base.clone(true);
            const heading = typeof p.heading === "number" ? p.heading : 0;
            clone.rotation.y = -(heading * Math.PI) / 180;
            // Slightly smaller for the leading-edge path markers so they don't compete with live planes.
            if (p.kind === "leading") clone.scale.multiplyScalar(0.7);
            return clone;
          }}
          onObjectClick={(d: object) => {
            const p = d as RenderedPlane;
            if (onPlaneClick && p.icao24) onPlaneClick(p.icao24);
          }}
        />
      )}
    </div>
  );
});

export default GlobeView;
