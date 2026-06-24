export type Flight = {
  departureAirport: string | null;
  arrivalAirport: string | null;
  firstSeen?: number;
  lastSeen?: number;
  icao24?: string | null;

  depLat?: number | null;
  depLng?: number | null;
  arrLat?: number | null;
  arrLng?: number | null;

  callsign?: string | null;
  originCountry?: string | null;
  aircraftModel?: string | null;
  celebrityName?: string | null;
  celebrityCategory?: string | null;
};

export type CelebrityAircraft = {
  registration: string;
  icao24: string;
  model: string;
};

export type Celebrity = {
  name: string;
  category: string;
  aircraft: CelebrityAircraft[];
};

export type PlaneStateDTO = {
  icao24: string;
  callsign?: string | null;
  lat?: number | null;
  lng?: number | null;
  heading?: number | null;
  velocity?: number | null;
  altitude?: number | null;
  onGround?: boolean | null;
  originCountry?: string | null;
};

export type AnalyticsBucket = { label: string; count: number };

export type Analytics = {
  totalFlights: number;
  celebrityFlights: number;
  topDepartureCountries: AnalyticsBucket[];
  topArrivalCountries: AnalyticsBucket[];
  topRoutes: AnalyticsBucket[];
  topDepartureAirports: AnalyticsBucket[];
  topArrivalAirports: AnalyticsBucket[];
  topOriginCountries: AnalyticsBucket[];
  topAircraftModels: AnalyticsBucket[];
};

async function getJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url);
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch (e) {
    console.error("fetch error", url, e);
    return fallback;
  }
}

export async function getFlights(): Promise<Flight[]> {
  const data = await getJson<unknown>("/api/flights", []);
  return normalizeFlights(data);
}

export async function getCelebrityFlights(): Promise<Flight[]> {
  const data = await getJson<unknown>("/api/flights/celebrities", []);
  return normalizeFlights(data);
}

export async function getAirborneCelebrities(): Promise<Flight[]> {
  const data = await getJson<unknown>("/api/celebrities/airborne", []);
  return normalizeFlights(data);
}

export async function getCelebrities(): Promise<Celebrity[]> {
  const data = await getJson<unknown>("/api/celebrities", []);
  if (!Array.isArray(data)) return [];
  return data as Celebrity[];
}

export async function getAnalytics(): Promise<Analytics | null> {
  return await getJson<Analytics | null>("/api/analytics", null);
}

export async function getBatchStates(icao24s: string[]): Promise<PlaneStateDTO[]> {
  if (icao24s.length === 0) return [];
  try {
    const res = await fetch("/api/states/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icao24s }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as PlaneStateDTO[]) : [];
  } catch (e) {
    console.error("getBatchStates error", e);
    return [];
  }
}

function normalizeFlights(data: unknown): Flight[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const v = it as Record<string, unknown>;
      return {
        departureAirport: typeof v.departureAirport === "string" ? v.departureAirport : null,
        arrivalAirport: typeof v.arrivalAirport === "string" ? v.arrivalAirport : null,
        firstSeen: typeof v.firstSeen === "number" ? v.firstSeen : undefined,
        lastSeen: typeof v.lastSeen === "number" ? v.lastSeen : undefined,
        depLat: typeof v.depLat === "number" ? v.depLat : null,
        depLng: typeof v.depLng === "number" ? v.depLng : null,
        arrLat: typeof v.arrLat === "number" ? v.arrLat : null,
        arrLng: typeof v.arrLng === "number" ? v.arrLng : null,
        icao24: typeof v.icao24 === "string" ? v.icao24 : null,
        callsign: typeof v.callsign === "string" ? v.callsign : null,
        originCountry: typeof v.originCountry === "string" ? v.originCountry : null,
        aircraftModel: typeof v.aircraftModel === "string" ? v.aircraftModel : null,
        celebrityName: typeof v.celebrityName === "string" ? v.celebrityName : null,
        celebrityCategory: typeof v.celebrityCategory === "string" ? v.celebrityCategory : null,
      };
    })
    .filter(Boolean) as Flight[];
}
