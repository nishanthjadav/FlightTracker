package com.nishanth.flight_tracker.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.nishanth.flight_tracker.dto.BatchStateRequest;
import com.nishanth.flight_tracker.dto.FlightDTO;
import com.nishanth.flight_tracker.dto.PlaneStateDTO;
import com.nishanth.flight_tracker.model.Celebrity;
import com.nishanth.flight_tracker.service.AnalyticsService;
import com.nishanth.flight_tracker.service.CelebrityService;
import com.nishanth.flight_tracker.service.FlightService;
import com.nishanth.flight_tracker.client.OpenSkyClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.concurrent.atomic.AtomicReference;

@RestController
public class FlightController {

    private static final Logger log = LoggerFactory.getLogger(FlightController.class);

    private final FlightService flightService;
    private final OpenSkyClient openSkyClient;
    private final CelebrityService celebrityService;
    private final AnalyticsService analyticsService;

    public FlightController(
        FlightService flightService,
        OpenSkyClient openSkyClient,
        CelebrityService celebrityService,
        AnalyticsService analyticsService
    ) {
        this.flightService = flightService;
        this.openSkyClient = openSkyClient;
        this.celebrityService = celebrityService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/api/flights")
    public List<FlightDTO> getFlights() {
        List<FlightDTO> flights = flightService.getFlights();
        log.info("Returning {} flights", flights.size());
        return flights;
    }

    @GetMapping("/api/flights/celebrities")
    public List<FlightDTO> getCelebrityFlights() {
        List<FlightDTO> flights = flightService.getCelebrityFlights();
        log.info("Returning {} celebrity flights from cache", flights.size());
        return flights;
    }

    @GetMapping("/api/celebrities/airborne")
    public List<FlightDTO> probeCelebrityFlights() {
        return flightService.probeCelebrityFlights();
    }

    @GetMapping("/api/celebrities")
    public List<Celebrity> getCelebrities() {
        return celebrityService.getAll();
    }

    @PostMapping("/api/states/batch")
    public List<PlaneStateDTO> getStatesBatch(@RequestBody BatchStateRequest request) {
        if (request == null || request.getIcao24s() == null || request.getIcao24s().isEmpty()) {
            return List.of();
        }

        // Cache by sorted-set of icao24s (order-independent) for 60s. The frontend
        // polls every 10s, so the same key collapses ~5 of every 6 requests to a
        // memory hit. The synchronized block also coalesces concurrent identical
        // requests so we don't fan out to OpenSky from multiple threads at once.
        String key = request.getIcao24s().stream()
            .filter(s -> s != null && !s.isBlank())
            .map(String::toLowerCase)
            .collect(java.util.stream.Collectors.toCollection(TreeSet::new))
            .toString();

        long now = System.currentTimeMillis();
        BatchCacheEntry cached = batchCache.get();
        if (cached != null && cached.key.equals(key) && (now - cached.timestamp) < BATCH_CACHE_TTL_MS) {
            return cached.value;
        }

        // Serialize misses so a burst of identical requests fans in to one upstream call.
        synchronized (batchCache) {
            cached = batchCache.get();
            now = System.currentTimeMillis();
            if (cached != null && cached.key.equals(key) && (now - cached.timestamp) < BATCH_CACHE_TTL_MS) {
                return cached.value;
            }

            List<PlaneStateDTO> fresh = openSkyClient.fetchStatesBatch(request.getIcao24s());
            if (!fresh.isEmpty()) {
                batchCache.set(new BatchCacheEntry(key, fresh, System.currentTimeMillis()));
                return fresh;
            }
            // Empty result (either OpenSky rate-limited us or returned nothing) —
            // return stale cache if we have one for this key, else empty list.
            if (cached != null && cached.key.equals(key)) {
                return cached.value;
            }
            return fresh;
        }
    }

    private static final long BATCH_CACHE_TTL_MS = 60_000;
    private final AtomicReference<BatchCacheEntry> batchCache = new AtomicReference<>();

    private record BatchCacheEntry(String key, List<PlaneStateDTO> value, long timestamp) {}

    @GetMapping("/api/analytics")
    public Map<String, Object> getAnalytics() {
        return analyticsService.compute();
    }

    @GetMapping("/api/state/{icao24}")
    public Map<String, Object> getState(@PathVariable String icao24) {
        log.info("Fetching state for ICAO: {}", icao24);
        JsonNode node = openSkyClient.fetchState(icao24);
        Map<String, Object> out = new HashMap<>();
        out.put("icao24", icao24);
        if (node == null) return out;

        JsonNode states = node.get("states");
        if (states == null || !states.isArray() || states.size() == 0) return out;

        JsonNode s = states.get(0);
        Double lon = s.has(5) && !s.get(5).isNull() ? s.get(5).asDouble() : null;
        Double lat = s.has(6) && !s.get(6).isNull() ? s.get(6).asDouble() : null;
        Double velocity = s.has(9) && !s.get(9).isNull() ? s.get(9).asDouble() : null;
        Double heading = s.has(10) && !s.get(10).isNull() ? s.get(10).asDouble() : null;

        out.put("lat", lat);
        out.put("lng", lon);
        out.put("velocity", velocity);
        out.put("heading", heading);
        return out;
    }
}
