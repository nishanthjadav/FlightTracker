package com.nishanth.flight_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishanth.flight_tracker.client.HexDbClient;
import com.nishanth.flight_tracker.client.OpenSkyClient;
import com.nishanth.flight_tracker.dto.FlightDTO;
import com.nishanth.flight_tracker.dto.PlaneStateDTO;
import com.nishanth.flight_tracker.model.Airport;
import com.nishanth.flight_tracker.model.Celebrity;
import com.nishanth.flight_tracker.model.CelebrityAircraft;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FlightService {

    private static final Logger log = LoggerFactory.getLogger(FlightService.class);

    private final OpenSkyClient openSkyClient;
    private final HexDbClient hexDbClient;
    private final CelebrityService celebrityService;
    private final ObjectMapper mapper = new ObjectMapper();

    private final Map<String, Airport> airportCache = new HashMap<>();
    private final FlightCache flightCache = new FlightCache();

    private long lastFetchTime = 0;
    private static final long IN_MEMORY_TTL_MS = 60_000; // 1 min in-memory refresh

    @Value("${app.cache-dir:cache}")
    private String cacheDir;

    @Value("${app.cache-ttl-hours:24}")
    private long cacheTtlHours;

    public FlightService(OpenSkyClient openSkyClient, HexDbClient hexDbClient, CelebrityService celebrityService) {
        this.openSkyClient = openSkyClient;
        this.hexDbClient = hexDbClient;
        this.celebrityService = celebrityService;
    }

    public List<FlightDTO> getFlights() {
        if (!flightCache.get().isEmpty() &&
            System.currentTimeMillis() - lastFetchTime < IN_MEMORY_TTL_MS) {
            return flightCache.get();
        }

        try {
            long now = System.currentTimeMillis() / 1000L;
            // Chain 12 sequential 2-hour windows covering the last 24h. OpenSky's
            // /flights/all caps at a 2h window per request, so we walk backward.
            // Dedupe by (icao24, firstSeen) — the same flight may appear in two
            // windows if it straddles a boundary.
            final long WINDOW_SECONDS = 2 * 3600;
            final int WINDOW_COUNT = 12;

            List<Map<String, Object>> items = new ArrayList<>();
            for (int i = 0; i < WINDOW_COUNT; i++) {
                long end = now - (long) i * WINDOW_SECONDS;
                long begin = end - WINDOW_SECONDS;
                String raw = openSkyClient.fetchFlightsRaw(begin, end);
                if (raw == null || raw.isBlank()) {
                    log.warn("OpenSky window {}/{} returned no data", i + 1, WINDOW_COUNT);
                    continue;
                }
                try {
                    List<Map<String, Object>> chunk = mapper.readValue(raw, new TypeReference<>() {});
                    items.addAll(chunk);
                } catch (Exception e) {
                    log.warn("Failed to parse window {}/{}: {}", i + 1, WINDOW_COUNT, e.getMessage());
                }
            }

            if (items.isEmpty()) {
                log.warn("All OpenSky windows empty, falling back to existing cache");
                return flightCache.get();
            }

            // Dedupe by (icao24, firstSeen). Same physical flight can appear in
            // multiple 2h windows if its arrival straddles a boundary.
            Set<String> seen = new HashSet<>();
            List<FlightDTO> out = new ArrayList<>();

            for (Map<String, Object> m : items) {

                String dep = m.get("estDepartureAirport") instanceof String ? (String) m.get("estDepartureAirport") : null;
                String arr = m.get("estArrivalAirport") instanceof String ? (String) m.get("estArrivalAirport") : null;
                String icao24 = m.get("icao24") instanceof String ? (String) m.get("icao24") : null;

                // Skip only when we have no identifier at all.
                if (icao24 == null || icao24.isBlank()) continue;

                // Same flight (icao24 + firstSeen) reported in multiple overlapping windows? skip dup.
                Long firstSeen = m.get("firstSeen") instanceof Number
                        ? ((Number) m.get("firstSeen")).longValue()
                        : null;
                Long lastSeen = m.get("lastSeen") instanceof Number
                        ? ((Number) m.get("lastSeen")).longValue()
                        : null;
                if (firstSeen == null || lastSeen == null) continue;

                String dedupKey = icao24.toLowerCase() + ":" + firstSeen;
                if (!seen.add(dedupKey)) continue;

                // Normalize sentinel values to null so downstream code can treat them uniformly.
                if (dep != null && (dep.isBlank() || dep.equalsIgnoreCase("UNKNOWN"))) dep = null;
                if (arr != null && (arr.isBlank() || arr.equalsIgnoreCase("UNKNOWN"))) arr = null;
                // A flight that "departs" and "arrives" at the same airport is usually
                // a position-estimator artifact (touch-and-go, parked transponder, etc.) —
                // worth keeping the row but not drawing it as a route.
                if (dep != null && arr != null && dep.equals(arr)) {
                    dep = null;
                    arr = null;
                }

                Airport depAirport = dep != null ? getAirportCached(dep) : null;
                Airport arrAirport = arr != null ? getAirportCached(arr) : null;

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
                } else {
                    dto = new FlightDTO(dep, arr, firstSeen, lastSeen);
                }
                dto.setIcao24(icao24);

                out.add(dto);
            }

            log.info("Fetched {} raw rows across {} windows → {} unique flights after dedup",
                items.size(), WINDOW_COUNT, out.size());
            if (!out.isEmpty()) {
                FlightDTO sample = out.get(0);
                log.info("Sample: dep={} arr={} icao24={}", sample.getDepartureAirport(), sample.getArrivalAirport(), sample.getIcao24());
            }

            enrichWithStates(out);
            enrichWithCelebrities(out);

            flightCache.set(out);
            saveFlightsToDisk(out);
            lastFetchTime = System.currentTimeMillis();

            return out;

        } catch (Exception e) {
            log.error("FlightService.getFlights failed", e);
            return flightCache.get(); // fallback instead of empty
        }
    }
    private File getCacheFile() {
        File dir = new File(cacheDir);
        dir.mkdirs();
        return new File(dir, "flights.json");
    }

    private void saveFlightsToDisk(List<FlightDTO> flights) {
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(getCacheFile(), flights);
            log.info("Saved {} flights to disk cache", flights.size());
        } catch (Exception e) {
            log.error("Failed saving flight cache to disk", e);
        }
    }

    @PostConstruct
    public void loadCacheOnStartup() {
        try {
            File file = getCacheFile();
            if (!file.exists()) return;

            long ageMs = System.currentTimeMillis() - file.lastModified();
            long ttlMs = cacheTtlHours * 3_600_000L;

            if (ageMs > ttlMs) {
                log.info("Disk cache is {}h old (TTL {}h), will fetch fresh data",
                    ageMs / 3_600_000, cacheTtlHours);
                return;
            }

            List<FlightDTO> cached = mapper.readValue(file, new TypeReference<List<FlightDTO>>() {});
            // Always re-apply celebrity enrichment in case the catalog has been updated since the cache was written.
            enrichWithCelebrities(cached);
            flightCache.set(cached);
            lastFetchTime = file.lastModified();

            log.info("Loaded {} flights from disk cache ({}min old)",
                cached.size(), ageMs / 60_000);

        } catch (Exception e) {
            log.error("Failed loading flight cache from disk", e);
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

    private void enrichWithStates(List<FlightDTO> flights) {
        List<String> codes = flights.stream()
            .map(FlightDTO::getIcao24)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());
        if (codes.isEmpty()) return;

        List<PlaneStateDTO> states = openSkyClient.fetchStatesBatch(codes);
        Map<String, PlaneStateDTO> byCode = new HashMap<>();
        for (PlaneStateDTO s : states) {
            if (s.getIcao24() != null) byCode.put(s.getIcao24().toLowerCase(), s);
        }

        for (FlightDTO f : flights) {
            if (f.getIcao24() == null) continue;
            PlaneStateDTO s = byCode.get(f.getIcao24().toLowerCase());
            if (s == null) continue;
            f.setCallsign(s.getCallsign());
            f.setOriginCountry(s.getOriginCountry());
        }
        log.info("Enriched {} flights with state data ({} matched)", flights.size(), byCode.size());
    }

    private void enrichWithCelebrities(List<FlightDTO> flights) {
        int matched = 0;
        for (FlightDTO f : flights) {
            if (f.getIcao24() == null) continue;
            Celebrity c = celebrityService.findByIcao24(f.getIcao24());
            if (c == null) continue;
            f.setCelebrityName(c.getName());
            f.setCelebrityCategory(c.getCategory());
            CelebrityAircraft a = celebrityService.findAircraft(f.getIcao24());
            if (a != null && f.getAircraftModel() == null) {
                f.setAircraftModel(a.getModel());
            }
            matched++;
        }
        if (matched > 0) log.info("Matched {} celebrity flights", matched);
    }

    public List<FlightDTO> getCelebrityFlights() {
        return getFlights().stream()
            .filter(f -> f.getCelebrityName() != null)
            .collect(Collectors.toList());
    }

    /**
     * Probe OpenSky directly for every celebrity icao24 in our catalog. Returns any
     * that are currently broadcasting a position, synthesized as FlightDTO objects.
     * This catches celebrity flights that don't appear in the 1-hour /flights/all window.
     */
    public List<FlightDTO> probeCelebrityFlights() {
        List<String> catalogIcaos = celebrityService.getAll().stream()
            .flatMap(c -> c.getAircraft().stream())
            .map(CelebrityAircraft::getIcao24)
            .filter(Objects::nonNull)
            .distinct()
            .collect(Collectors.toList());

        if (catalogIcaos.isEmpty()) return List.of();

        List<PlaneStateDTO> states = openSkyClient.fetchStatesBatch(catalogIcaos);
        List<FlightDTO> airborne = new ArrayList<>();

        for (PlaneStateDTO s : states) {
            if (s.getIcao24() == null || s.getLat() == null || s.getLng() == null) continue;
            // Filter out aircraft that are squawking but parked on the ground.
            if (Boolean.TRUE.equals(s.getOnGround())) continue;

            Celebrity celeb = celebrityService.findByIcao24(s.getIcao24());
            if (celeb == null) continue;
            CelebrityAircraft ac = celebrityService.findAircraft(s.getIcao24());

            FlightDTO f = new FlightDTO();
            f.setIcao24(s.getIcao24());
            f.setCallsign(s.getCallsign());
            f.setOriginCountry(s.getOriginCountry());
            f.setCelebrityName(celeb.getName());
            f.setCelebrityCategory(celeb.getCategory());
            if (ac != null) f.setAircraftModel(ac.getModel());
            airborne.add(f);
        }

        log.info("Celebrity probe: {} icao24s queried, {} states returned, {} airborne",
            catalogIcaos.size(), states.size(), airborne.size());
        return airborne;
    }
}