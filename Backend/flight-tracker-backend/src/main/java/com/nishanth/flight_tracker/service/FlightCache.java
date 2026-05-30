package com.nishanth.flight_tracker.service;

import com.nishanth.flight_tracker.dto.FlightDTO;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class FlightCache {

    private final AtomicReference<List<FlightDTO>> cache = new AtomicReference<>(List.of());

    public List<FlightDTO> get() {
        return cache.get();
    }

    public void set(List<FlightDTO> flights) {
        cache.set(flights);
    }
}