import type { Flight } from "../api/flights";

export type Arc = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
};

export function buildArcs(flights: Flight[]): Arc[] {
  const out: Arc[] = [];

  for (const f of flights) {
    if (!f.departureAirport || !f.arrivalAirport) continue;

    if (
      f.departureLat == null ||
      f.departureLng == null ||
      f.arrivalLat == null ||
      f.arrivalLng == null
    ) continue;

    out.push({
      startLat: f.departureLat,
      startLng: f.departureLng,
      endLat: f.arrivalLat,
      endLng: f.arrivalLng,
    });
  }

  return out;
}