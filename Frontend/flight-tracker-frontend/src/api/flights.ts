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
};

export async function getFlights(): Promise<Flight[]> {
  try {
    const res = await fetch("/api/flights");

    console.log("status:", res.status);

    const data = await res.json(); 

    console.log("Fetched flights:", data);

    if (!Array.isArray(data)) return [];

    return data
      .map((it) => {
        if (!it || typeof it !== "object") return null;

        return {
          departureAirport:
            typeof it.departureAirport === "string" ? it.departureAirport : null,
          arrivalAirport:
            typeof it.arrivalAirport === "string" ? it.arrivalAirport : null,
          firstSeen:
            typeof it.firstSeen === "number" ? it.firstSeen : undefined,
          lastSeen:
            typeof it.lastSeen === "number" ? it.lastSeen : undefined,
          depLat:
            typeof it.depLat === "number" ? it.depLat : null,
          depLng:
            typeof it.depLng === "number" ? it.depLng : null,
          arrLat:
            typeof it.arrLat === "number" ? it.arrLat : null,
          arrLng:
            typeof it.arrLng === "number" ? it.arrLng : null,
          icao24:
            typeof it.icao24 === "string" ? it.icao24 : null,
        };
      })
      .filter(Boolean) as Flight[];

  } catch (e) {
    console.error("getFlights error", e);
    return [];
  }
}
