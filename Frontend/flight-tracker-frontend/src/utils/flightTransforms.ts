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
      console.log("flight sample:", f);

    if (
      f.depLat == null ||
      f.depLng == null ||
      f.arrLat == null ||
      f.arrLng == null
    ) continue;

    out.push({
      startLat: f.depLat,
      startLng: f.depLng,
      endLat: f.arrLat,
      endLng: f.arrLng,
    });
  }

  console.log("Built arcs:", out.length);
  return out;
}