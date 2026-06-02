package com.nishanth.flight_tracker.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.nishanth.flight_tracker.dto.FlightDTO;
import com.nishanth.flight_tracker.service.FlightService;
import com.nishanth.flight_tracker.client.OpenSkyClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class FlightController {

    private static final Logger log = LoggerFactory.getLogger(FlightController.class);

    private final FlightService flightService;
    private final OpenSkyClient openSkyClient;

    public FlightController(FlightService flightService, OpenSkyClient openSkyClient) {
        this.flightService = flightService;
        this.openSkyClient = openSkyClient;
    }

    @GetMapping("/api/flights")
    public List<FlightDTO> getFlights() {
        List<FlightDTO> flights = flightService.getFlights();
        log.info("Controller returning {} flights", flights.size());
        return flights;
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
        // per spec: [5]=longitude, [6]=latitude, [9]=velocity, [10]=true_track
        Double lon = s.has(5) && !s.get(5).isNull() ? s.get(5).asDouble() : null;
        Double lat = s.has(6) && !s.get(6).isNull() ? s.get(6).asDouble() : null;
        Double velocity = s.has(9) && !s.get(9).isNull() ? s.get(9).asDouble() : null;
        Double heading = s.has(10) && !s.get(10).isNull() ? s.get(10).asDouble() : null;

        out.put("lat", lat);
        out.put("lng", lon);
        out.put("velocity", velocity);
        out.put("heading", heading);

        log.info("Received position: icao={} lat={} lng={} heading={} vel={}", icao24, lat, lon, heading, velocity);

        return out;
    }
}