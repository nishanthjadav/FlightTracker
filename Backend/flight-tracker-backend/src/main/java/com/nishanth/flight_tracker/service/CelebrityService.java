package com.nishanth.flight_tracker.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nishanth.flight_tracker.model.Celebrity;
import com.nishanth.flight_tracker.model.CelebrityAircraft;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CelebrityService {

    private static final Logger log = LoggerFactory.getLogger(CelebrityService.class);

    private List<Celebrity> celebrities = new ArrayList<>();
    private final Map<String, Celebrity> byIcao24 = new HashMap<>();

    @PostConstruct
    public void load() {
        try {
            ClassPathResource resource = new ClassPathResource("celebrities.json");
            ObjectMapper mapper = new ObjectMapper();
            celebrities = mapper.readValue(resource.getInputStream(), new TypeReference<List<Celebrity>>() {});

            for (Celebrity c : celebrities) {
                if (c.getAircraft() == null) continue;
                for (CelebrityAircraft a : c.getAircraft()) {
                    if (a.getIcao24() == null) continue;
                    byIcao24.put(a.getIcao24().toLowerCase(), c);
                }
            }

            log.info("Loaded {} celebrities, indexed {} aircraft by icao24",
                celebrities.size(), byIcao24.size());
        } catch (Exception e) {
            log.error("Failed to load celebrities.json", e);
        }
    }

    public List<Celebrity> getAll() {
        return celebrities;
    }

    public Celebrity findByIcao24(String icao24) {
        if (icao24 == null) return null;
        return byIcao24.get(icao24.toLowerCase());
    }

    public CelebrityAircraft findAircraft(String icao24) {
        Celebrity c = findByIcao24(icao24);
        if (c == null || c.getAircraft() == null) return null;
        return c.getAircraft().stream()
            .filter(a -> icao24.equalsIgnoreCase(a.getIcao24()))
            .findFirst()
            .orElse(null);
    }
}
