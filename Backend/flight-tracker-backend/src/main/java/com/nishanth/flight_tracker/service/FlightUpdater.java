package com.nishanth.flight_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishanth.flight_tracker.client.OpenSkyClient;
import com.nishanth.flight_tracker.dto.FlightDTO;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
public class FlightUpdater {

    private final OpenSkyClient openSkyClient;
    private final FlightCache flightCache;
    private final ObjectMapper mapper = new ObjectMapper();

    public FlightUpdater(OpenSkyClient openSkyClient, FlightCache flightCache) {
        this.openSkyClient = openSkyClient;
        this.flightCache = flightCache;
    }

    @Scheduled(fixedDelay = 30000) // dis is 30 sec
    public void refreshFlights() {
        try {
            long now = System.currentTimeMillis() / 1000L;
            long begin = now - 3600;

            String raw = openSkyClient.fetchFlightsRaw(begin, now);
            if (raw == null || raw.isBlank()) return;

            List<Map<String, Object>> items =
                    mapper.readValue(raw, new TypeReference<>() {});

            List<FlightDTO> out = new ArrayList<>();

            for (Map<String, Object> m : items) {
                String dep = (String) m.get("estDepartureAirport");
                String arr = (String) m.get("estArrivalAirport");

                if (dep == null || arr == null) continue;
                if (dep.equals(arr)) continue;

                Long firstSeen = m.get("firstSeen") instanceof Number
                        ? ((Number) m.get("firstSeen")).longValue()
                        : null;

                Long lastSeen = m.get("lastSeen") instanceof Number
                        ? ((Number) m.get("lastSeen")).longValue()
                        : null;

                if (firstSeen == null || lastSeen == null) continue;

                out.add(new FlightDTO(dep, arr, firstSeen, lastSeen));
            }

            flightCache.set(out);

            System.out.println("Cached flights: " + out.size());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}