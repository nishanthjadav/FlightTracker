package com.nishanth.flight_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishanth.flight_tracker.client.HexDbClient;
import com.nishanth.flight_tracker.client.OpenSkyClient;
import com.nishanth.flight_tracker.dto.FlightDTO;
import com.nishanth.flight_tracker.model.Airport;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class FlightService {

    private static final Logger log = LoggerFactory.getLogger(FlightService.class);

    private final OpenSkyClient openSkyClient;
    private final HexDbClient hexDbClient;
    private final ObjectMapper mapper = new ObjectMapper();

    private final Map<String, Airport> airportCache = new HashMap<>();
    private final FlightCache flightCache = new FlightCache();

    private long lastFetchTime = 0;
    private static final long CACHE_TTL_MS = 60_000; // 1 min refresh

    @Value("${app.dev-mode:false}")
    private boolean devMode;

    public FlightService(OpenSkyClient openSkyClient, HexDbClient hexDbClient) {
        this.openSkyClient = openSkyClient;
        this.hexDbClient = hexDbClient;
    }

    public List<FlightDTO> getFlights() {
        if (devMode && !flightCache.get().isEmpty()) {
            log.info("DEV MODE: serving cached flights");
            return flightCache.get();
        }
        if (!flightCache.get().isEmpty() &&
            System.currentTimeMillis() - lastFetchTime < CACHE_TTL_MS) {
            return flightCache.get();
        }

        try {
            long now = System.currentTimeMillis() / 1000L;
            long begin = now - 3600;

            String raw = openSkyClient.fetchFlightsRaw(begin, now);

            if (raw == null || raw.isBlank()) {
                return flightCache.get(); // fallback to old cache
            }

            List<Map<String, Object>> items =
                    mapper.readValue(raw, new TypeReference<>() {});

            List<FlightDTO> out = new ArrayList<>();

            for (Map<String, Object> m : items) {

                String dep = (String) m.get("estDepartureAirport");
                String arr = (String) m.get("estArrivalAirport");
                String icao24 = m.get("icao24") instanceof String ? (String) m.get("icao24") : null;

                if (dep == null || arr == null) continue;
                if (dep.isBlank() || arr.isBlank()) continue;
                if (dep.equals(arr)) continue;
                if (dep.equalsIgnoreCase("UNKNOWN") || arr.equalsIgnoreCase("UNKNOWN")) continue;

                Long firstSeen = m.get("firstSeen") instanceof Number
                        ? ((Number) m.get("firstSeen")).longValue()
                        : null;

                Long lastSeen = m.get("lastSeen") instanceof Number
                        ? ((Number) m.get("lastSeen")).longValue()
                        : null;

                if (firstSeen == null || lastSeen == null) continue;

                Airport depAirport = getAirportCached(dep);
                Airport arrAirport = getAirportCached(arr);

                FlightDTO dto;

                if (depAirport != null && arrAirport != null) {
                    dto = new FlightDTO(
                            dep,
                            arr,
                            firstSeen,
                            lastSeen,
                            depAirport.getLat(),
                            depAirport.getLon(),
                            arrAirport.getLat(),
                            arrAirport.getLon()
                    );
                    dto.setIcao24(icao24);
                } else {
                    dto = new FlightDTO(dep, arr, firstSeen, lastSeen);
                    dto.setIcao24(icao24);
                }

                out.add(dto);
            }

            log.info("Parsed flights: {}", out.size());
            if (!out.isEmpty()) {
                FlightDTO sample = out.get(0);
                log.info("Sample flight: dep={} arr={} icao24={}", sample.getDepartureAirport(), sample.getArrivalAirport(), sample.getIcao24());
            }

            flightCache.set(out);
            saveFlightsToDisk(out);
            lastFetchTime = System.currentTimeMillis();

            return out;

        } catch (Exception e) {
            log.error("FlightService.getFlights failed", e);
            return flightCache.get(); // fallback instead of empty
        }
    }
    private void saveFlightsToDisk(List<FlightDTO> flights) {
        try {
            mapper.writerWithDefaultPrettyPrinter()
              .writeValue(
                  new java.io.File("src/main/resources/cache/flights.json"),
                  flights
              );
        } catch (Exception e) {
            log.error("Failed saving flight cache", e);
        }
    }
    
        @PostConstruct
        public void loadCacheOnStartup() {
        try {
            File file = new File("src/main/resources/cache/flights.json");

            if (!file.exists()) return;

            List<FlightDTO> cached =
                mapper.readValue(
                    file,
                    new TypeReference<List<FlightDTO>>() {}
                );

            flightCache.set(cached);

            log.info("Loaded {} cached flights", cached.size());

        } catch (Exception e) {
            log.error("Failed loading flight cache", e);
        }
    }

    private Airport getAirportCached(String icao) {
        if (icao == null) return null;

        return airportCache.computeIfAbsent(icao, code -> {
            try {
                return hexDbClient.fetchAirport(code);
            } catch (Exception e) {
                return null;
            }
        });
    }
}