
//temp 
export type Airport = {
  code: string;
  lat: number;
  lon: number;
  name?: string;
};

export const airportMap: Record<string, Airport> = {
  KDFW: { code: "KDFW", lat: 32.8998, lon: -97.0403, name: "Dallas/Fort Worth" },
  KMSP: { code: "KMSP", lat: 44.8848, lon: -93.2223, name: "Minneapolis" },
  KROC: { code: "KROC", lat: 43.1189, lon: -77.6724, name: "Rochester" },
  KOAK: { code: "KOAK", lat: 37.7126, lon: -122.2197, name: "Oakland" },
  KPSP: { code: "KPSP", lat: 33.8297, lon: -116.5067, name: "Palm Springs" },
  KABE: { code: "KABE", lat: 40.6521, lon: -75.4408, name: "Allentown" },
  KTEB: { code: "KTEB", lat: 40.8501, lon: -74.0608, name: "Teterboro" },
  KTTN: { code: "KTTN", lat: 40.2769, lon: -74.8135, name: "Trenton" },
  KABQ: { code: "KABQ", lat: 35.0402, lon: -106.6090, name: "Albuquerque" },
  KSJC: { code: "KSJC", lat: 37.3639, lon: -121.9289, name: "San Jose" },
  KMIA: { code: "KMIA", lat: 25.7959, lon: -80.2870, name: "Miami" },
  KNTD: { code: "KNTD", lat: 34.1203, lon: -119.1206, name: "Point Mugu" },
  KECP: { code: "KECP", lat: 30.3583, lon: -85.7956, name: "Panama City" },

  CYVR: { code: "CYVR", lat: 49.1967, lon: -123.1815, name: "Vancouver" },
  CYDC: { code: "CYDC", lat: 49.4683, lon: -120.5111, name: "Princeton" },
  CYNJ: { code: "CYNJ", lat: 49.1008, lon: -122.6306, name: "Langley" },
  CYPK: { code: "CYPK", lat: 49.2161, lon: -122.7090, name: "Pitt Meadows" },

  MMMY: { code: "MMMY", lat: 25.7785, lon: -100.1069, name: "Monterrey" },
  MMTO: { code: "MMTO", lat: 19.3371, lon: -99.5660, name: "Toluca" },

  ETHC: { code: "ETHC", lat: 52.9167, lon: 9.2833, name: "Celle (Germany)" },

  VTBD: { code: "VTBD", lat: 13.9126, lon: 100.6067, name: "Bangkok Don Mueang" },
  RCPO: { code: "RCPO", lat: 24.7600, lon: 120.9520, name: "Hsinchu (TW)" },

  PHUP: { code: "PHUP", lat: 12.1236, lon: 119.9770, name: "Ubay (PH)" },

  YMML: { code: "YMML", lat: -37.6690, lon: 144.8410, name: "Melbourne" },

  "1CO4": { code: "1CO4", lat: 39.2269, lon: -104.8660, name: "Colorado Airstrip" },
  "1WA9": { code: "1WA9", lat: 48.0200, lon: -122.8710, name: "Washington Airstrip" },
  "33AK": { code: "33AK", lat: 61.2510, lon: -149.8060, name: "Alaska Strip" },
  "03NY": { code: "03NY", lat: 42.8920, lon: -77.4380, name: "New York Strip" },
};