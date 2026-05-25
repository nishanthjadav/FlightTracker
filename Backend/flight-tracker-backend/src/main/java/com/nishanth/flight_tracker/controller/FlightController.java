package com.nishanth.flight_tracker.controller;


import com.nishanth.flight_tracker.model.Flight;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/flights")
public class FlightController
{
    private final List<Flight> flights = List.of(
            new Flight("1", "Delta", 40.7128, -74.0060),
            new Flight("2", "Delta", 34.0522, -118.2437),
            new Flight("3", "United", 41.8781, -87.6298),
            new Flight("4", "American", 29.7604, -95.3698)
    );

    @GetMapping
    public List<Flight> getFlights(@RequestParam(required = false) String airline) {
        if (airline == null) return flights;

        return flights.stream()
                .filter(f -> f.airline.equalsIgnoreCase(airline))
                .toList();
    }
}
