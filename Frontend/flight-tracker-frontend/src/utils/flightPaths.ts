import type { Flight } from "../api/flights";

export type PathPoint = [number, number, number, number]; // [lat, lng, altFraction, colorIndex]

export type FlightPath = {
  points: PathPoint[];
  isCelebrity: boolean;
  icao24?: string;
};

/**
 * Great-circle interpolation using spherical linear interpolation (slerp).
 * Returns a point at parameter t (0..1) along the shortest path between two lat/lng pairs.
 */
function slerp(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  t: number
): [number, number] {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;

  const phi1 = lat1 * toRad;
  const lam1 = lng1 * toRad;
  const phi2 = lat2 * toRad;
  const lam2 = lng2 * toRad;

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);
  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dot = Math.min(1, Math.max(-1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);
  if (omega < 1e-9) return [lat1, lng1];

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * toDeg;
  const lng = Math.atan2(y, x) * toDeg;
  return [lat, lng];
}

/**
 * Builds a flight path with a parabolic altitude profile (climb → cruise → descend).
 * Returns ~32 [lat, lng, altFraction] waypoints per flight where altFraction is
 * the altitude relative to typical cruise (0..1).
 *
 * The "colorIndex" is also altFraction, exposed separately so the caller can
 * decouple geometry from color mapping if needed.
 */
export function buildFlightPaths(flights: Flight[]): FlightPath[] {
  const SEGMENTS = 32;
  const out: FlightPath[] = [];

  for (const f of flights) {
    if (f.depLat == null || f.depLng == null || f.arrLat == null || f.arrLng == null) continue;

    const points: PathPoint[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const [lat, lng] = slerp(f.depLat, f.depLng, f.arrLat, f.arrLng, t);
      // Parabolic altitude profile, peak at t=0.5. Touchdown at 0 at both ends.
      const altFraction = 4 * t * (1 - t);
      points.push([lat, lng, altFraction, altFraction]);
    }

    out.push({
      points,
      isCelebrity: !!f.celebrityName,
      icao24: f.icao24 ?? undefined,
    });
  }

  return out;
}

/**
 * A plane marker at the leading edge (arrival end) of a flight path.
 * Heading is computed from the final two waypoints so the plane points
 * along the direction of travel.
 */
export type PathPlane = {
  lat: number;
  lng: number;
  heading: number;
  isCelebrity: boolean;
  icao24?: string;
};

/**
 * For each flight path, place a plane icon at its leading (arrival) endpoint.
 * Returns one PathPlane per path. Heading is the great-circle bearing from
 * the second-to-last to the last waypoint.
 */
export function buildPathPlanes(paths: FlightPath[]): PathPlane[] {
  const out: PathPlane[] = [];
  for (const p of paths) {
    if (p.points.length < 2) continue;
    const last = p.points[p.points.length - 1];
    const prev = p.points[p.points.length - 2];
    const heading = bearing(prev[0], prev[1], last[0], last[1]);
    out.push({
      lat: last[0],
      lng: last[1],
      heading,
      isCelebrity: p.isCelebrity,
      icao24: p.icao24,
    });
  }
  return out;
}

/** Initial great-circle bearing from (lat1,lng1) to (lat2,lng2), in degrees [0..360). */
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = Math.PI / 180;
  const toDeg = 180 / Math.PI;
  const phi1 = lat1 * toRad;
  const phi2 = lat2 * toRad;
  const dLambda = (lng2 - lng1) * toRad;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const theta = Math.atan2(y, x) * toDeg;
  return (theta + 360) % 360;
}

/**
 * Yellow → Orange → Red color ramp based on altitude fraction.
 * 0 = yellow (low / ground), 1 = red (high / cruise).
 */
export function altitudeColor(altFraction: number, alpha: number = 1): string {
  const t = Math.max(0, Math.min(1, altFraction));
  // Yellow (255, 220, 0) → Orange (255, 140, 0) → Red (230, 50, 30)
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const k = t / 0.5;
    r = 255;
    g = Math.round(220 + (140 - 220) * k);
    b = Math.round(0 + (0 - 0) * k);
  } else {
    const k = (t - 0.5) / 0.5;
    r = Math.round(255 + (230 - 255) * k);
    g = Math.round(140 + (50 - 140) * k);
    b = Math.round(0 + (30 - 0) * k);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
