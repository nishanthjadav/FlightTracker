/**
 * ICAO airport code → "City, Country (CODE)" lookup. Backed by the OpenFlights
 * dataset (~7,600 airports), which covers virtually every real-world ICAO code
 * including the small private/exec fields celebrities use.
 *
 * Falls back to the bare code for anything not in the dataset.
 */
import airportsData from "./airports-data.json";

const AIRPORTS = airportsData as Record<string, string>;

/** "Philadelphia, United States (KPHL)" / "Tokyo, Japan (RJTT)" — bare code if unknown. */
export function airportLabel(icao: string | null | undefined): string {
  if (!icao) return "";
  const up = icao.toUpperCase();
  const info = AIRPORTS[up];
  if (!info) return up;
  return `${info} (${up})`;
}

export function hasAirportInfo(icao: string | null | undefined): boolean {
  if (!icao) return false;
  return Object.prototype.hasOwnProperty.call(AIRPORTS, icao.toUpperCase());
}
