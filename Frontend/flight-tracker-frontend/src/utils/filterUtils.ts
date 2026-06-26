import type { Flight, PlaneStateDTO } from "../api/flights";
import { countryFromIcao } from "./icaoCountry";
import { regionFromCoords } from "./region";

export type FlightStatus = "airborne" | "ground" | "unknown";
export type FlightSource = "live" | "historical";

/**
 * A Flight with extra derived fields used by filters and the sidebar.
 * Built once per render of the merged flight set, then queried many times.
 */
export type EnrichedFlight = Flight & {
  status: FlightStatus;
  depCountry: string | null;
  arrCountry: string | null;
  /** Currently airborne or on-ground with a live state vector. */
  isLive: boolean;
  /** Came from /api/flights (historical fetch with route data). */
  isHistorical: boolean;
  /** Region derived from live position when available, else dep airport. */
  region: string | null;
  /** Altitude band derived from live state altitude (metres). */
  altBand: "low" | "cruise" | "high" | null;
  /** Speed band derived from live state velocity (m/s). */
  speedBand: "slow" | "cruise" | "fast" | null;
};

export function enrichFlights(
  flights: Flight[],
  states: Record<string, PlaneStateDTO>,
  liveIcaos: Set<string>
): EnrichedFlight[] {
  return flights.map((f) => {
    const key = f.icao24?.toLowerCase();
    const state = key ? states[key] : undefined;

    let status: FlightStatus = "unknown";
    if (state) {
      if (state.onGround === true) status = "ground";
      else if (state.onGround === false) status = "airborne";
      else if (typeof state.lat === "number" && typeof state.lng === "number") status = "airborne";
    }

    const isLive = !!state || (!!key && liveIcaos.has(key));
    // Historical = has departure/arrival route data (the /api/flights origin).
    const isHistorical = !!(f.departureAirport || f.arrivalAirport || f.firstSeen);

    // Region: prefer live position, else dep airport coords, else null.
    let regionLat = state?.lat ?? null;
    let regionLng = state?.lng ?? null;
    if (regionLat == null || regionLng == null) {
      regionLat = f.depLat ?? null;
      regionLng = f.depLng ?? null;
    }
    const region = regionLat != null && regionLng != null ? regionFromCoords(regionLat, regionLng) : null;

    // Altitude bands (metres). Approx: <2000m = low (climb/descent/local), 2000-9000m = cruise mid,
    // >9000m = high cruise. Use altitude from live state only.
    let altBand: EnrichedFlight["altBand"] = null;
    if (typeof state?.altitude === "number") {
      if (state.altitude < 2000) altBand = "low";
      else if (state.altitude < 9000) altBand = "cruise";
      else altBand = "high";
    }

    // Speed bands (m/s). <100 = slow, 100-220 = cruise, >220 = fast.
    let speedBand: EnrichedFlight["speedBand"] = null;
    if (typeof state?.velocity === "number") {
      if (state.velocity < 100) speedBand = "slow";
      else if (state.velocity < 220) speedBand = "cruise";
      else speedBand = "fast";
    }

    return {
      ...f,
      status,
      depCountry: countryFromIcao(f.departureAirport),
      arrCountry: countryFromIcao(f.arrivalAirport),
      isLive,
      isHistorical,
      region,
      altBand,
      speedBand,
    };
  });
}

// ---------- Filters ----------

export type FlightFilters = {
  source: "" | FlightSource; // "" = all
  departureAirport: string;
  arrivalAirport: string;
  departureCountry: string;
  arrivalCountry: string;
  operatorCountry: string;
  aircraftModel: string;
  celebrityCategory: string;
  region: string;
  altBand: "" | "low" | "cruise" | "high";
  speedBand: "" | "slow" | "cruise" | "fast";
  status: "" | FlightStatus;
  celebOnly: boolean;
  hasCoordsOnly: boolean;
};

export const DEFAULT_FILTERS: FlightFilters = {
  source: "",
  departureAirport: "",
  arrivalAirport: "",
  departureCountry: "",
  arrivalCountry: "",
  operatorCountry: "",
  aircraftModel: "",
  celebrityCategory: "",
  region: "",
  altBand: "",
  speedBand: "",
  status: "",
  celebOnly: false,
  hasCoordsOnly: false,
};

export const ACTIVE_KEYS: (keyof FlightFilters)[] = [
  "source",
  "departureAirport",
  "arrivalAirport",
  "departureCountry",
  "arrivalCountry",
  "operatorCountry",
  "aircraftModel",
  "celebrityCategory",
  "region",
  "altBand",
  "speedBand",
  "status",
  "celebOnly",
  "hasCoordsOnly",
];

export function countActive(f: FlightFilters): number {
  let n = 0;
  if (f.source) n++;
  if (f.departureAirport) n++;
  if (f.arrivalAirport) n++;
  if (f.departureCountry) n++;
  if (f.arrivalCountry) n++;
  if (f.operatorCountry) n++;
  if (f.aircraftModel) n++;
  if (f.celebrityCategory) n++;
  if (f.region) n++;
  if (f.altBand) n++;
  if (f.speedBand) n++;
  if (f.status) n++;
  if (f.celebOnly) n++;
  if (f.hasCoordsOnly) n++;
  return n;
}

function matchesField(
  f: EnrichedFlight,
  key: keyof FlightFilters,
  v: FlightFilters
): boolean {
  switch (key) {
    case "source":
      if (!v.source) return true;
      return v.source === "live" ? f.isLive : f.isHistorical;
    case "departureAirport":
      return !v.departureAirport || f.departureAirport === v.departureAirport;
    case "arrivalAirport":
      return !v.arrivalAirport || f.arrivalAirport === v.arrivalAirport;
    case "departureCountry":
      return !v.departureCountry || f.depCountry === v.departureCountry;
    case "arrivalCountry":
      return !v.arrivalCountry || f.arrCountry === v.arrivalCountry;
    case "operatorCountry":
      return !v.operatorCountry || f.originCountry === v.operatorCountry;
    case "aircraftModel":
      return !v.aircraftModel || f.aircraftModel === v.aircraftModel;
    case "celebrityCategory":
      return !v.celebrityCategory || f.celebrityCategory === v.celebrityCategory;
    case "region":
      return !v.region || f.region === v.region;
    case "altBand":
      return !v.altBand || f.altBand === v.altBand;
    case "speedBand":
      return !v.speedBand || f.speedBand === v.speedBand;
    case "status":
      return !v.status || f.status === v.status;
    case "celebOnly":
      return !v.celebOnly || !!f.celebrityName;
    case "hasCoordsOnly":
      return (
        !v.hasCoordsOnly ||
        (f.depLat != null && f.depLng != null && f.arrLat != null && f.arrLng != null)
      );
  }
}

export function applyAllFilters(flights: EnrichedFlight[], filters: FlightFilters): EnrichedFlight[] {
  return flights.filter((f) => ACTIVE_KEYS.every((k) => matchesField(f, k, filters)));
}

export function applyFiltersExcept(
  flights: EnrichedFlight[],
  filters: FlightFilters,
  exceptKey: keyof FlightFilters
): EnrichedFlight[] {
  return flights.filter((f) =>
    ACTIVE_KEYS.every((k) => (k === exceptKey ? true : matchesField(f, k, filters)))
  );
}

export type Option = { value: string; label?: string; count: number };

/**
 * Build cascading options for a string-valued filter field. Returns the unique
 * values from flights that satisfy ALL OTHER active filters, each paired with
 * how many flights would still match if that value were selected.
 *
 * Options with count === 0 are never returned. The currently-selected value is
 * always included (with count 0 if stale) so the UI can show it.
 */
export function buildOptions(
  flights: EnrichedFlight[],
  filters: FlightFilters,
  field: keyof FlightFilters,
  extract: (f: EnrichedFlight) => string | null | undefined,
  options?: { sort?: "count" | "alpha"; labelFor?: (value: string) => string }
): Option[] {
  const candidate = applyFiltersExcept(flights, filters, field);
  const counts = new Map<string, number>();
  for (const f of candidate) {
    const v = extract(f);
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  const current = (filters[field] as string) ?? "";
  if (current && !counts.has(current)) counts.set(current, 0);

  const labelFor = options?.labelFor ?? ((s: string) => s);
  const sort = options?.sort ?? "count";

  const result: Option[] = Array.from(counts.entries()).map(([value, count]) => ({
    value,
    label: labelFor(value),
    count,
  }));

  if (sort === "alpha") {
    result.sort((a, b) => (a.label ?? a.value).localeCompare(b.label ?? b.value));
  } else {
    result.sort(
      (a, b) =>
        b.count - a.count || (a.label ?? a.value).localeCompare(b.label ?? b.value)
    );
  }

  return result;
}
